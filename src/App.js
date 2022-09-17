import './App.css';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import axios from 'axios'
import { BigNumber, ethers } from 'ethers';
import { ForceGraph2D } from 'react-force-graph';

const nodeCanvasObject = (node, ctx, globalScale) => {
  const label = node.id;
  const fontSize = 12 / globalScale;
  ctx.font = `${fontSize}px Sans-Serif`;
  const textWidth = ctx.measureText(label).width;
  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = node.color;
  ctx.fillText(label, node.x, node.y);

  node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
}


function App() {
  const [snapshotData, setSnapshotData] = useState(undefined)
  const NODE_R = 8

  useEffect(() => {
    const retrieveEvents = async () => {
      //const response = await axios.get('/events.json')
      //const {events, blockEnd} = response.data
      //setSnapshotData(getSnapshot(blockEnd, events))
      const response = await axios.get('/snapshot.json')
      setSnapshotData(response.data)
    }
    retrieveEvents()
  }, [])

  const [hoverNode, setHoverNode] = useState(null);

  const handleNodeHover = node => {
    setHoverNode(node || null);
  };

  const handleClick = node => {
    console.log(node)
  };


  const paintRing = useCallback((node, ctx) => {
    // add ring just for highlighted nodes
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
    ctx.fillStyle = node === hoverNode ? 'red' : 'orange';
    ctx.fill();
  }, [hoverNode]);

  return (
    <>
      {snapshotData && <ForceGraph2D
        graphData={snapshotData}
        nodeRelSize={NODE_R}
        autoPauseRedraw={false}
        nodeCanvasObject={paintRing}
        onNodeHover={handleNodeHover}
        onNodeClick={handleClick}
      />
      }
    </>
  )
}

export default App;
