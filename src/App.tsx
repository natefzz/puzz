import "./App.css";
import { useEffect, useRef, useState } from "react";

interface PuzzlePiece {
  id: number;
  x: number;
  y: number;
  // Connection relationships: which pieces should connect (top, right, bottom, left)
  connections: {
    top: number | null; // ID of piece that should connect above
    right: number | null; // ID of piece that should connect to the right
    bottom: number | null; // ID of piece that should connect below
    left: number | null; // ID of piece that should connect to the left
  };
  // List of currently connected piece IDs
  connectedTo: number[];
  // Group ID (pieces in the same group move together)
  groupId: number;
}

const initialPieces: PuzzlePiece[] = [
  // First row
  {
    id: 1,
    x: 50,
    y: 50,
    connections: { top: null, right: 2, bottom: 4, left: null },
    connectedTo: [],
    groupId: 1,
  },
  {
    id: 2,
    x: 200,
    y: 50,
    connections: { top: null, right: 3, bottom: 5, left: 1 },
    connectedTo: [],
    groupId: 2,
  },
  {
    id: 3,
    x: 350,
    y: 50,
    connections: { top: null, right: null, bottom: 6, left: 2 },
    connectedTo: [],
    groupId: 3,
  },
  // Second row
  {
    id: 4,
    x: 50,
    y: 200,
    connections: { top: 1, right: 5, bottom: 7, left: null },
    connectedTo: [],
    groupId: 4,
  },
  {
    id: 5,
    x: 200,
    y: 200,
    connections: { top: 2, right: 6, bottom: 8, left: 4 },
    connectedTo: [],
    groupId: 5,
  },
  {
    id: 6,
    x: 350,
    y: 200,
    connections: { top: 3, right: null, bottom: 9, left: 5 },
    connectedTo: [],
    groupId: 6,
  },
  // Third row
  {
    id: 7,
    x: 50,
    y: 350,
    connections: { top: 4, right: 8, bottom: null, left: null },
    connectedTo: [],
    groupId: 7,
  },
  {
    id: 8,
    x: 200,
    y: 350,
    connections: { top: 5, right: 9, bottom: null, left: 7 },
    connectedTo: [],
    groupId: 8,
  },
  {
    id: 9,
    x: 350,
    y: 350,
    connections: { top: 6, right: null, bottom: null, left: 8 },
    connectedTo: [],
    groupId: 9,
  },
];

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPieceId, setDraggedPieceId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [layerOrder, setLayerOrder] = useState<number[]>([
    1, 2, 3, 4, 5, 6, 7, 8, 9,
  ]); // Group IDs in draw order

  const [pieces, setPieces] = useState<PuzzlePiece[]>(initialPieces);

  const handleReset = () => {
    setPieces(JSON.parse(JSON.stringify(initialPieces)));
    setIsDragging(false);
    setDraggedPieceId(null);
    setLayerOrder([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  };

  const pieceSize = 100;
  const snapDistance = 20;

  // Get all puzzle pieces in the same group
  const getPiecesInGroup = (groupId: number): PuzzlePiece[] => {
    return pieces.filter((p) => p.groupId === groupId);
  };

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sort pieces by layer order
    const sortedPieces = [...pieces].sort((a, b) => {
      return layerOrder.indexOf(a.groupId) - layerOrder.indexOf(b.groupId);
    });

    console.log("sortedPieces", sortedPieces);

    // Draw all puzzle pieces
    sortedPieces.forEach((piece) => {
      // Change color based on connection status
      const isConnected = piece.connectedTo.length > 0;
      ctx.fillStyle = isConnected ? "#22c55e" : "#4f46e5";
      ctx.fillRect(piece.x, piece.y, pieceSize, pieceSize);

      // Draw border
      ctx.strokeStyle = isConnected ? "#16a34a" : "#585858";
      ctx.lineWidth = 2;
      ctx.strokeRect(piece.x, piece.y, pieceSize, pieceSize);

      // Draw piece number
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        piece.id.toString(),
        piece.x + pieceSize / 2,
        piece.y + pieceSize / 2,
      );
    });
  }, [pieces, layerOrder]);

  // Check if two puzzle pieces should connect and are close enough
  const checkConnection = (
    piece1: PuzzlePiece,
    piece2: PuzzlePiece,
  ): string | null => {
    const dx = piece2.x - piece1.x;
    const dy = piece2.y - piece1.y;

    // Check right connection
    if (piece1.connections.right === piece2.id) {
      if (
        Math.abs(dy) < snapDistance &&
        Math.abs(dx - pieceSize) < snapDistance
      ) {
        return "right";
      }
    }
    // Check left connection
    if (piece1.connections.left === piece2.id) {
      if (
        Math.abs(dy) < snapDistance &&
        Math.abs(dx + pieceSize) < snapDistance
      ) {
        return "left";
      }
    }
    // Check bottom connection
    if (piece1.connections.bottom === piece2.id) {
      if (
        Math.abs(dx) < snapDistance &&
        Math.abs(dy - pieceSize) < snapDistance
      ) {
        return "bottom";
      }
    }
    // Check top connection
    if (piece1.connections.top === piece2.id) {
      if (
        Math.abs(dx) < snapDistance &&
        Math.abs(dy + pieceSize) < snapDistance
      ) {
        return "top";
      }
    }

    return null;
  };

  // Get snap position
  const getSnapPosition = (
    piece1: PuzzlePiece,
    piece2: PuzzlePiece,
    direction: string,
  ): { x: number; y: number } => {
    switch (direction) {
      case "right":
        return { x: piece2.x - pieceSize, y: piece2.y };
      case "left":
        return { x: piece2.x + pieceSize, y: piece2.y };
      case "bottom":
        return { x: piece2.x, y: piece2.y - pieceSize };
      case "top":
        return { x: piece2.x, y: piece2.y + pieceSize };
      default:
        return { x: piece1.x, y: piece1.y };
    }
  };

  // Check if mouse is inside a puzzle piece
  const getPieceAtPosition = (
    mouseX: number,
    mouseY: number,
  ): number | null => {
    for (let i = pieces.length - 1; i >= 0; i--) {
      const piece = pieces[i];
      if (
        mouseX >= piece.x &&
        mouseX <= piece.x + pieceSize &&
        mouseY >= piece.y &&
        mouseY <= piece.y + pieceSize
      ) {
        return piece.id;
      }
    }
    return null;
  };

  // Get mouse coordinates in canvas
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const mousePos = getMousePos(e);
    const pieceId = getPieceAtPosition(mousePos.x, mousePos.y);

    if (pieceId !== null) {
      const piece = pieces.find((p) => p.id === pieceId);
      if (piece) {
        setIsDragging(true);
        setDraggedPieceId(pieceId);

        // Move this group to the top of layer order
        setLayerOrder((prevOrder) => {
          const newOrder = prevOrder.filter((id) => id !== piece.groupId);
          return [...newOrder, piece.groupId];
        });

        setDragOffset({
          x: mousePos.x - piece.x,
          y: mousePos.y - piece.y,
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || draggedPieceId === null) return;

    const mousePos = getMousePos(e);
    const draggedPiece = pieces.find((p) => p.id === draggedPieceId);
    if (!draggedPiece) return;

    // Calculate movement distance
    const deltaX = mousePos.x - dragOffset.x - draggedPiece.x;
    const deltaY = mousePos.y - dragOffset.y - draggedPiece.y;

    // Move the entire group
    setPieces((prevPieces) =>
      prevPieces.map((piece) =>
        piece.groupId === draggedPiece.groupId
          ? {
              ...piece,
              x: piece.x + deltaX,
              y: piece.y + deltaY,
            }
          : piece,
      ),
    );
  };

  const handleMouseUp = () => {
    if (draggedPieceId !== null) {
      const draggedPiece = pieces.find((p) => p.id === draggedPieceId);
      if (draggedPiece) {
        // Get all puzzle pieces in the dragged group
        const draggedGroup = getPiecesInGroup(draggedPiece.groupId);

        // Check if any piece in the dragged group can connect with pieces in other groups
        setPieces((prevPieces) => {
          let newPieces = [...prevPieces];

          for (const piece1 of draggedGroup) {
            for (let i = 0; i < newPieces.length; i++) {
              const piece2 = newPieces[i];

              // Don't check pieces in the same group or already connected pieces
              if (
                piece1.groupId !== piece2.groupId &&
                !piece1.connectedTo.includes(piece2.id)
              ) {
                const direction = checkConnection(piece1, piece2);

                if (direction) {
                  // Calculate snap position
                  const snapPos = getSnapPosition(piece1, piece2, direction);
                  const offsetX = snapPos.x - piece1.x;
                  const offsetY = snapPos.y - piece1.y;

                  // Move entire dragged group to snap position
                  newPieces = newPieces.map((p) =>
                    p.groupId === piece1.groupId
                      ? { ...p, x: p.x + offsetX, y: p.y + offsetY }
                      : p,
                  );

                  // Update connection relationships
                  const piece1Index = newPieces.findIndex(
                    (p) => p.id === piece1.id,
                  );
                  const piece2Index = newPieces.findIndex(
                    (p) => p.id === piece2.id,
                  );

                  newPieces[piece1Index] = {
                    ...newPieces[piece1Index],
                    connectedTo: [
                      ...newPieces[piece1Index].connectedTo,
                      piece2.id,
                    ],
                  };
                  newPieces[piece2Index] = {
                    ...newPieces[piece2Index],
                    connectedTo: [
                      ...newPieces[piece2Index].connectedTo,
                      piece1.id,
                    ],
                  };

                  // Merge two groups
                  const oldGroupId1 = piece1.groupId;
                  const oldGroupId2 = piece2.groupId;
                  const newGroupId = Math.min(oldGroupId1, oldGroupId2);

                  newPieces = newPieces.map((p) =>
                    p.groupId === oldGroupId1 || p.groupId === oldGroupId2
                      ? { ...p, groupId: newGroupId }
                      : p,
                  );

                  // Return immediately after finding connection to avoid multiple connections
                  return newPieces;
                }
              }
            }
          }

          return newPieces;
        });
      }
    }

    setIsDragging(false);
    setDraggedPieceId(null);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <h1 className="">puzz</h1>
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="border border-gray-400 bg-white cursor-move"
      />
      <button
        onClick={handleReset}
        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        reset
      </button>
    </div>
  );
}

export default App;
