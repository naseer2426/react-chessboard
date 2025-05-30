import { ReactNode, useEffect, useState } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";

import { useChessboard } from "../context/chessboard-context";
import { Coords, CustomPieceFn, Piece as Pc, Square } from "../types";

type PieceProps = {
  isPremovedPiece?: boolean;
  piece: Pc;
  square: Square;
  squares: { [square in Square]?: Coords };
};

export function Piece({
  isPremovedPiece = false,
  piece,
  square,
  squares,
}: PieceProps) {
  const {
    animationDuration,
    arePiecesDraggable,
    boardWidth,
    boardOrientation,
    chessPieces,
    boardState,
    deletePieceFromSquare,
    dropOffBoardAction,
    id,
    isDraggablePiece,
    onPieceClick,
    onPieceDragBegin,
    onPieceDragEnd,
    onPieceDropOffBoard,
    onPromotionCheck,
  } = useChessboard();

  const [pieceStyle, setPieceStyle] = useState({
    opacity: 1,
    zIndex: 5,
    touchAction: "none",
    cursor:
      arePiecesDraggable && isDraggablePiece({ piece, sourceSquare: square })
        ? "-webkit-grab"
        : "default",
  });

  const [{ canDrag, isDragging }, drag, dragPreview] = useDrag(
    () => ({
      type: "piece",
      item: () => {
        onPieceDragBegin(piece, square);
        return { piece, square, id };
      },
      end: (item, monitor) => {
        onPieceDragEnd(piece, square);

        const wasDropOutsideTheBoard = !monitor.didDrop();

        if (wasDropOutsideTheBoard) {
          if (dropOffBoardAction === "trash") {
            deletePieceFromSquare(square);
          }

          onPieceDropOffBoard?.(square, piece);
        }
      },
      collect: (monitor) => ({
        canDrag: isDraggablePiece({ piece, sourceSquare: square }),
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [piece, square, boardState.getBoard(), id]
  );

  // hide the default preview
  dragPreview(getEmptyImage(), { captureDraggingState: true });

  // hide piece on drag
  useEffect(() => {
    setPieceStyle((oldPieceStyle) => ({
      ...oldPieceStyle,
      opacity: isDragging ? 0 : 1,
    }));
  }, [isDragging]);

  // new move has come in
  // if waiting for animation, then animation has started and we can perform animation
  // we need to head towards where we need to go, we are the source, we are heading towards the target
  useEffect(() => {
    const diff = boardState.getDiff();
    const removedPiece = diff.removed?.[square];
    // return as null and not loaded yet
    if (!diff.added || !removedPiece) return;
    // check if piece matches or if removed piece was a pawn and new square is on 1st or 8th rank (promotion)
    const newSquare = (
      Object.entries(diff.added) as [Square, Pc][]
    ).find(
      ([s, p]) =>
        p === removedPiece || onPromotionCheck(square, s, removedPiece)
    );
    // we can perform animation if our square was in removed, AND the matching piece is in added AND this isn't a premoved piece
    if (
      boardState.getIsWaitingForAnimation() &&
      removedPiece &&
      newSquare &&
      !isPremovedPiece
    ) {
      const sourceSq = square;
      const targetSq = newSquare[0];

      const sourceIdx = boardState.getLocationIdx(sourceSq);
      const targetIdx = boardState.getLocationIdx(targetSq);
      const xDiff = targetIdx.col - sourceIdx.col;
      const yDiff = targetIdx.row - sourceIdx.row;

      if (sourceSq && targetSq) {
        const squareWidth = boardWidth / 8;
        setPieceStyle((oldPieceStyle) => ({
          ...oldPieceStyle,
          transform: `translate(${(boardOrientation === "black" ? -1 : 1) *
            (xDiff) *
            squareWidth
            }px, ${(boardOrientation === "black" ? -1 : 1) *
            (yDiff) *
            squareWidth
            }px)`,
          transition: `transform ${animationDuration}ms`,
          zIndex: 6,
        }));
      }
    }
  }, [boardState.getDiff()]);

  // translate to their own positions (repaint on undo)
  useEffect(() => {
    const { sourceSq } = getSingleSquareCoordinates();
    if (sourceSq) {
      setPieceStyle((oldPieceStyle) => ({
        ...oldPieceStyle,
        transform: `translate(${0}px, ${0}px)`,
        transition: `transform ${0}ms`,
      }));
    }
  }, [boardState.getBoard()]);

  // update is piece draggable
  useEffect(() => {
    setPieceStyle((oldPieceStyle) => ({
      ...oldPieceStyle,
      cursor:
        arePiecesDraggable && isDraggablePiece({ piece, sourceSquare: square })
          ? "-webkit-grab"
          : "default",
    }));
  }, [square, boardState.getBoard(), arePiecesDraggable]);

  function getSingleSquareCoordinates() {
    return { sourceSq: squares[square] };
  }

  return (
    <div
      ref={arePiecesDraggable && canDrag ? drag : null}
      onClick={() => onPieceClick(piece, square)}
      data-piece={piece}
      style={pieceStyle}
    >
      {typeof chessPieces[piece] === "function" ? (
        (chessPieces[piece] as CustomPieceFn)({
          squareWidth: boardWidth / 8,
          isDragging,
          square,
        })
      ) : (
        <svg
          viewBox={"1 1 43 43"}
          width={boardWidth / 8}
          height={boardWidth / 8}
          style={{ display: "block" }}
        >
          <g>{chessPieces[piece] as ReactNode}</g>
        </svg>
      )}
    </div>
  );
}
