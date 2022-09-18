import './App.css';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import axios from 'axios'
import { BigNumber, FixedNumber } from 'ethers';
import { ForceGraph3D, ForceGraph2D } from 'react-force-graph';
import { formatEther, parseEther } from 'ethers/lib/utils';


function App() {
  const [snapshotData, setSnapshotData] = useState(undefined)
  const [snapshotLastData, setSnapshotLastData] = useState(undefined)
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
    const retrieveSnapshots = async () => {

      console.log(snapshotIndex)
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
  }, [snapshotIndex])

  const handleNodeHover = node => {
    setHoverNode(node || null);
  };

  const handleClick = node => {
    console.log(node)
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
      if (nodeBalanceBN.gt(parseEther('100.0'))  && nodeBalanceBN.lt(parseEther('1000.0'))) radius = 30
      if (nodeBalanceBN.gt(parseEther('1000.0'))  && nodeBalanceBN.lt(parseEther('10000.0'))) radius = 30
      if (nodeBalanceBN.gt(parseEther('10000.0'))) radius = 100

      //if (maxBalanceLoaded && nodeHasBalance) {
      //  let factor = nodeBalanceBN.divUnsafe(maxBalanceBN).toUnsafeFloat();
      //  const extraRadius = 10.89917 - 1.0 / (Math.sqrt(Math.sqrt(factor)) + 0.11237);
      //  radius = MIN_RADIUS + extraRadius;
      //}


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
          <input id="default-range" type="range" value={sliderValue} onChange={(e) => setSliderValue(e.target.value)} max={blocks.length} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
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