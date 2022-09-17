import axios from "axios";
import { BigNumber, ethers, providers } from "ethers";
import retry from "async-retry"
import fsSync, { promises as fs } from 'fs';

const etherscanApiKey = "B4PM25UGKVB6GQMW1GZ85BQ3T42Y1YM8GV"
const provider = new providers.AlchemyProvider("homestead", "5j5E8mip-BikydOl6dDSJ578mKsAXuvJ")
const abi = [
  "event Transfer(address indexed from, address indexed to, uint amount)"
]
const address = "0x25f8087ead173b73d6e8b84329989a8eea16cf73" // YGG
const contract = new ethers.Contract(address, abi, provider);
const filter = contract.filters.Transfer()

const deployentTx = (await axios.get(`https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${address}&apikey=${etherscanApiKey}`))
  .data.result.slice()[0].txHash

const blockInterval = 2000
const blockStart = (await provider.getTransaction(deployentTx)).blockNumber
//const blockEnd = (await provider.getBlock("latest")).number
const blockEnd = blockStart + (blockInterval * 10)

const range = (start, stop, step) => Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + (i * step))

const blockRange = range(blockStart, blockEnd, blockInterval).reduce((prev, curr) => {
  const last = prev.slice(-1)[0] || [0, 0]
  return [...prev, [last[1], curr]]
}, []).slice(1, -1)

const events = (await Promise.all(blockRange.map(async range => {
  await new Promise(r => setTimeout(r, 1000));
  return await retry(async bail => {
    const transfers = (await contract.queryFilter(filter, range[0], range[1])).map(event => {
      const { from, to, amount } = event.args
      const { blockNumber } = event
      return { from, to, amount: amount.toString(), blockNumber }
    })
    return transfers
  })
}))).flat(1).sort((a, b) => a.blockNumber > b.blockNumber)

const eventsJSON = JSON.stringify({
  blockStart,
  blockEnd,
  events
})

await fs.writeFile('./public/events.json', eventsJSON, 'utf-8')

const getSnapshot = (blockNumber, events) => {
  if (!events) return {nodes: [], links: []}
  const snapshotEvents = events.filter(event => event.blockNumber <= blockNumber)

  const balances = snapshotEvents.reduce((balance, event) => {
    const amount = BigNumber.from(event.amount)
    const fromBalance = balance?.[event.from] || BigNumber.from(0)
    const toBalance = balance?.[event.to] || BigNumber.from(0)

    let newBalance = {[event.to]: toBalance.add(amount)}

    //if(event.from !== ethers.constants.AddressZero) {
      newBalance[event.from] = fromBalance.sub(amount)
    //}

    return {
      ...balance,
      ...newBalance
    }
  }, {})

  const cummulativeTransactions = snapshotEvents.reduce((links, event) => {
    const key = `${event.from}-${event.to}`
    const currentAmount = BigNumber.from(event.amount)
    const prevAmount = links?.[key] || BigNumber.from(0)
    return {...links, [key]: prevAmount.add(currentAmount)}
  }, {})

  const nodes = Object.entries(balances).map(([wallet, amount]) => ({id: wallet, amount: amount.toString()}))
  const links = Object.entries(cummulativeTransactions).map(([key, amount]) => {
    const [source, target] = key.split('-')
    return {source, target, amount: amount.toString()}
  })
  return {
    nodes,
    links
  }
}

console.log(getSnapshot(blockEnd, events))

const snapshotJSON = JSON.stringify(getSnapshot(blockEnd, events))
await fs.writeFile('./public/snapshot.json', snapshotJSON, 'utf-8')

const snapshotIndexes = range(blockStart, blockEnd, 200).map(index => {
  const fileName = `./public/snapshots/${index}.json`
  const snapshotJSON = JSON.stringify(getSnapshot(index, events))
  fsSync.writeFileSync(fileName, snapshotJSON, 'utf-8')
  return index
})

await fs.writeFile('./public/snapshot-indexes.json', JSON.stringify(snapshotIndexes), 'utf-8')