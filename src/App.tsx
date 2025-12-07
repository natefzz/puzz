import "./App.css";
import { useEffect, useRef, useState } from "react";

interface PuzzlePiece {
  id: number;
  x: number;
  y: number;
  width: number; // Actual width of this piece's image
  height: number; // Actual height of this piece's image
  // Edge offsets: positive = tab (protrudes out), negative = blank (indented), 0 = flat edge
  edgeOffsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
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

const TAB_SIZE = 46; // Size of protruding tabs
const BASE_WIDTH = 237; // Base puzzle piece width (including blank spaces)
const BASE_HEIGHT = 200; // Base puzzle piece height (including blank spaces)

const initialPieces: PuzzlePiece[] = [
  // First row
  {
    id: 1,
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    edgeOffsets: { top: 0, right: -TAB_SIZE, bottom: -TAB_SIZE, left: 0 }, // [0,1,1,0] - top/left flat, right/bottom blank
    connections: { top: null, right: 2, bottom: 4, left: null },
    connectedTo: [],
    groupId: 1,
  },
  {
    id: 2,
    x: 200,
    y: 50,
    width: 100,
    height: 100,
    edgeOffsets: { top: 0, right: TAB_SIZE, bottom: -TAB_SIZE, left: TAB_SIZE }, // [0,2,1,2] - top flat, right tab, bottom blank, left tab
    connections: { top: null, right: 3, bottom: 5, left: 1 },
    connectedTo: [],
    groupId: 2,
  },
  {
    id: 3,
    x: 350,
    y: 50,
    width: 100,
    height: 100,
    edgeOffsets: { top: 0, right: 0, bottom: -TAB_SIZE, left: -TAB_SIZE }, // [0,0,1,1] - top/right flat, bottom/left blank
    connections: { top: null, right: null, bottom: 6, left: 2 },
    connectedTo: [],
    groupId: 3,
  },
  // Second row
  {
    id: 4,
    x: 50,
    y: 200,
    width: 100,
    height: 100,
    edgeOffsets: {
      top: TAB_SIZE,
      right: -TAB_SIZE,
      bottom: -TAB_SIZE,
      left: 0,
    }, // [2,1,1,0] - top tab, right blank, bottom blank, left flat
    connections: { top: 1, right: 5, bottom: 7, left: null },
    connectedTo: [],
    groupId: 4,
  },
  {
    id: 5,
    x: 200,
    y: 200,
    width: 100,
    height: 100,
    edgeOffsets: {
      top: TAB_SIZE,
      right: TAB_SIZE,
      bottom: -TAB_SIZE,
      left: TAB_SIZE,
    }, // [2,2,1,2] - top/right/left tabs, bottom blank
    connections: { top: 2, right: 6, bottom: 8, left: 4 },
    connectedTo: [],
    groupId: 5,
  },
  {
    id: 6,
    x: 350,
    y: 200,
    width: 100,
    height: 100,
    edgeOffsets: { top: TAB_SIZE, right: 0, bottom: TAB_SIZE, left: -TAB_SIZE }, // [2,0,2,1] - top/bottom tabs, right flat, left blank
    connections: { top: 3, right: null, bottom: 9, left: 5 },
    connectedTo: [],
    groupId: 6,
  },
  // Third row
  {
    id: 7,
    x: 50,
    y: 350,
    width: 100,
    height: 100,
    edgeOffsets: { top: TAB_SIZE, right: -TAB_SIZE, bottom: 0, left: 0 }, // [2,1,0,0] - top tab, right blank, bottom/left flat
    connections: { top: 4, right: 8, bottom: null, left: null },
    connectedTo: [],
    groupId: 7,
  },
  {
    id: 8,
    x: 200,
    y: 350,
    width: 100,
    height: 100,
    edgeOffsets: { top: TAB_SIZE, right: -TAB_SIZE, bottom: 0, left: TAB_SIZE }, // [2,1,0,2] - top/left tabs, right blank, bottom flat
    connections: { top: 5, right: 9, bottom: null, left: 7 },
    connectedTo: [],
    groupId: 8,
  },
  {
    id: 9,
    x: 350,
    y: 350,
    width: 100,
    height: 100,
    edgeOffsets: { top: -TAB_SIZE, right: 0, bottom: 0, left: TAB_SIZE }, // [1,0,0,2] - left tab, top blank, right/bottom flat
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
  const [pieceImages, setPieceImages] = useState<{
    [key: number]: HTMLImageElement;
  }>({});

  const handleReset = () => {
    setPieces(JSON.parse(JSON.stringify(initialPieces)));
    setIsDragging(false);
    setDraggedPieceId(null);
    setLayerOrder([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  };

  const snapDistance = 20;

  // Get all puzzle pieces in the same group
  const getPiecesInGroup = (groupId: number): PuzzlePiece[] => {
    return pieces.filter((p) => p.groupId === groupId);
  };

  // Load puzzle piece images
  useEffect(() => {
    const images: { [key: number]: HTMLImageElement } = {};
    let loadedCount = 0;
    const totalImages = 9;

    // Mapping piece IDs to image file names
    const imageMapping: { [key: number]: string } = {
      1: "piece_0_0.png",
      2: "piece_0_1.png",
      3: "piece_0_2.png",
      4: "piece_1_0.png",
      5: "piece_1_1.png",
      6: "piece_1_2.png",
      7: "piece_2_0.png",
      8: "piece_2_1.png",
      9: "piece_2_2.png",
    };

    for (let i = 1; i <= 9; i++) {
      const img = new Image();
      const pieceId = i;
      img.onload = () => {
        loadedCount++;

        // Update the piece with actual image dimensions
        setPieces((prevPieces) =>
          prevPieces.map((piece) =>
            piece.id === pieceId
              ? { ...piece, width: img.width, height: img.height }
              : piece,
          ),
        );

        if (loadedCount === totalImages) {
          setPieceImages(images);
        }
      };
      img.onerror = () => {
        console.error(`Failed to load image for piece ${pieceId}`);
      };
      img.src = `/pieces/1/${imageMapping[i]}`;
      images[i] = img;
    }
  }, []);

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
      const img = pieceImages[piece.id];

      if (img && img.complete) {
        // Draw the puzzle piece image
        ctx.drawImage(img, piece.x, piece.y, piece.width, piece.height);
      } else {
        // Fallback: draw colored rectangle if image not loaded
        const isConnected = piece.connectedTo.length > 0;
        ctx.fillStyle = isConnected ? "#22c55e" : "#F9A66B";
        ctx.fillRect(piece.x, piece.y, piece.width, piece.height);

        // Draw border
        ctx.strokeStyle = isConnected ? "#16a34a" : "#434343";
        ctx.lineWidth = 1;
        ctx.strokeRect(piece.x, piece.y, piece.width, piece.height);

        // Draw piece number
        ctx.fillStyle = "#ffffff";
        ctx.font = "normal 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          piece.id.toString(),
          piece.x + piece.width / 2,
          piece.y + piece.height / 2,
        );
      }
    });
  }, [pieces, layerOrder, pieceImages]);

  // Check if two puzzle pieces should connect and are close enough
  const checkConnection = (
    piece1: PuzzlePiece,
    piece2: PuzzlePiece,
  ): string | null => {
    const dx = piece2.x - piece1.x;
    const dy = piece2.y - piece1.y;

    // Check right connection
    if (piece1.connections.right === piece2.id) {
      // Distance depends on piece1's right edge offset
      // If piece1 has tab (+46): distance = 237 + 46 = 283
      // If piece1 has blank (-46): distance = 237 - 46 = 191
      const expectedDx = BASE_WIDTH + piece1.edgeOffsets.right;
      const expectedDy = piece2.edgeOffsets.top - piece1.edgeOffsets.top;
      if (
        Math.abs(dy - expectedDy) < snapDistance &&
        Math.abs(dx - expectedDx) < snapDistance
      ) {
        return "right";
      }
    }
    // Check left connection
    if (piece1.connections.left === piece2.id) {
      const expectedDx = -(BASE_WIDTH + piece2.edgeOffsets.right);
      const expectedDy = piece2.edgeOffsets.top - piece1.edgeOffsets.top;
      if (
        Math.abs(dy - expectedDy) < snapDistance &&
        Math.abs(dx - expectedDx) < snapDistance
      ) {
        return "left";
      }
    }
    // Check bottom connection
    if (piece1.connections.bottom === piece2.id) {
      const expectedDx = piece2.edgeOffsets.left - piece1.edgeOffsets.left;
      const expectedDy =
        BASE_HEIGHT + piece1.edgeOffsets.bottom + piece2.edgeOffsets.top;
      if (
        Math.abs(dx - expectedDx) < snapDistance &&
        Math.abs(dy - expectedDy) < snapDistance
      ) {
        return "bottom";
      }
    }
    // Check top connection
    if (piece1.connections.top === piece2.id) {
      const expectedDx = piece2.edgeOffsets.left - piece1.edgeOffsets.left;
      const expectedDy = -(
        BASE_HEIGHT +
        piece2.edgeOffsets.bottom +
        piece1.edgeOffsets.top
      );
      if (
        Math.abs(dx - expectedDx) < snapDistance &&
        Math.abs(dy - expectedDy) < snapDistance
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
        return {
          x: piece2.x - (BASE_WIDTH + piece1.edgeOffsets.right),
          y: piece2.y - (piece2.edgeOffsets.top - piece1.edgeOffsets.top),
        };
      case "left":
        return {
          x: piece2.x + (BASE_WIDTH + piece2.edgeOffsets.right),
          y: piece2.y - (piece2.edgeOffsets.top - piece1.edgeOffsets.top),
        };
      case "bottom":
        return {
          x: piece2.x - (piece2.edgeOffsets.left - piece1.edgeOffsets.left),
          y:
            piece2.y -
            (BASE_HEIGHT + piece1.edgeOffsets.bottom + piece2.edgeOffsets.top),
        };
      case "top":
        return {
          x: piece2.x - (piece2.edgeOffsets.left - piece1.edgeOffsets.left),
          y:
            piece2.y +
            (BASE_HEIGHT + piece2.edgeOffsets.bottom + piece1.edgeOffsets.top),
        };
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
        mouseX <= piece.x + piece.width &&
        mouseY >= piece.y &&
        mouseY <= piece.y + piece.height
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
        width={800}
        height={800}
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
