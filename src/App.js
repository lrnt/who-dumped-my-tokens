import './App.css';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import axios from 'axios'
import { BigNumber, FixedNumber, providers } from 'ethers';
import { ForceGraph3D, ForceGraph2D } from 'react-force-graph';
import { formatEther, parseEther } from 'ethers/lib/utils';


const provider = new providers.AlchemyProvider("homestead", "5j5E8mip-BikydOl6dDSJ578mKsAXuvJ")


function App() {
  const [snapshotData, setSnapshotData] = useState(undefined)
  const [snapshotLastData, setSnapshotLastData] = useState(undefined)
  const [currentTime, setCurrentTime] = useState()
  const [blocks, setBlocks] = useState([])
  const [sliderValue, setSliderValue] = useState(0)

  const [maxBalanceBN, setMaxBalanceBN] = useState(FixedNumber.from(0));
  const [hoverNode, setHoverNode] = useState(null);

  const snapshotIndex = blocks?.[sliderValue]
  const NODE_R = 100

  useEffect(() => {
    const retrieveBlocks = async () => {
      const response = await axios.get('/snapshot-indexes.json')
      setBlocks(response.data)
    }
    retrieveBlocks()
  }, [])

  useEffect(() => {
    const retrieveSnapshotLast = async () => {
      const response = await axios.get(`/snapshot.json`)
      setSnapshotLastData(response.data)
    }
    retrieveSnapshotLast()
  }, [blocks])

  useEffect(() => {
    if (snapshotIndex === undefined) return
    const retrieveBlockTime = async () => {
      const timestamp = (await provider.getBlock(snapshotIndex)).timestamp
      setCurrentTime(timestamp * 1000)
    }
    const retrieveSnapshots = async () => {
      const response = await axios.get(`/snapshots/${snapshotIndex}.json`)
      setSnapshotData(response.data)

      const maxBN = Object.values(response.data.balances).reduce((acc, amount) => {
        const balanceBN = FixedNumber.from(amount);
        const diff = acc.subUnsafe(balanceBN);
        return diff.isNegative() ? balanceBN : acc;
      }, FixedNumber.from("0"));
      setMaxBalanceBN(maxBN);
    }
    retrieveSnapshots()
    retrieveBlockTime()
  }, [snapshotIndex])

  const handleNodeHover = node => {
    setHoverNode(node || null);
  };

  const handleClick = node => {
    console.log(node)
    const url = `https://etherscan.com/address/${node.id}`
    window.open(url, '_blank').focus();
  };

  // DRAW COLORED RINGS
  const drawNodeCanvas = useCallback(
    (node, ctx) => {
      ctx.beginPath();
      const MIN_RADIUS = 2.0;
      //let radius = MIN_RADIUS;
      const maxBalanceLoaded = !maxBalanceBN.isZero();
      const nodeBalanceBN = BigNumber.from(node.amount);
      const nodeHasBalance = !nodeBalanceBN.isZero();
      const nodeData = snapshotData?.balances?.[node.id]
      const isNodePresent = !!nodeData

      let radius = 2

      if (nodeBalanceBN.lt(parseEther('100.0'))) radius = 10
      if (nodeBalanceBN.gt(parseEther('100.0'))  && nodeBalanceBN.lt(parseEther('1000.0'))) radius = 15
      if (nodeBalanceBN.gt(parseEther('1000.0'))  && nodeBalanceBN.lt(parseEther('10000.0'))) radius = 20
      if (nodeBalanceBN.gt(parseEther('10000.0'))  && nodeBalanceBN.lt(parseEther('10000000.0'))) radius = 30
      if (nodeBalanceBN.gt(parseEther('10000000.0'))) radius = 100

      //if (maxBalanceLoaded && nodeHasBalance) {
      //  let factor = nodeBalanceBN.divUnsafe(maxBalanceBN).toUnsafeFloat();
      //  const extraRadius = 10.89917 - 1.0 / (Math.sqrt(Math.sqrt(factor)) + 0.11237);
      //  radius = MIN_RADIUS + extraRadius;
      //}


      node.r = radius
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = !isNodePresent ? 'transparent' : (!nodeHasBalance ? "grey" : node === hoverNode ? "red" : "blue")
      ctx.fill();
    },
    [hoverNode, maxBalanceBN, snapshotData]
  );

  const linkWidth = useCallback(
    (link) => {
      const key = `${link.source.id}-${link.target.id}`
      const isLinkPresent = !!snapshotData?.cummulativeTransactions?.[key]
      return isLinkPresent ? 'grey' : 'transparent'
    },
    [snapshotData]
  )

  return (
    <>
      {blocks && (
        <div className="flex w-full">
          <div className="grow">
          <input id="default-range" type="range" value={sliderValue} onChange={(e) => setSliderValue(e.target.value)} max={blocks.length} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
          </div>
          <div>
            {currentTime && (
              <>
               {new Date(currentTime).toLocaleDateString()}
               {" "}
               {new Date(currentTime).toLocaleTimeString()}
              </>
            )}
          </div>
        </div>
      )}
      {snapshotLastData && <ForceGraph2D
        graphData={snapshotLastData}
        autoPauseRedraw={false}
        nodeCanvasObject={drawNodeCanvas}
        linkColor={linkWidth}
        onNodeHover={handleNodeHover}
        onNodeClick={handleClick}
      />
      }
    </>
  )
}

export default App;