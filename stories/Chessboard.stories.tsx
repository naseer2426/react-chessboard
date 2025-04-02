import React, { forwardRef, useEffect, useRef, useState, useMemo } from "react";
import { Meta } from "@storybook/react";
import { Move, MoveType } from "../src/chessboard/types";
import { Chess, GameStatus } from "chessjs-expandable"

import {
  Chessboard,
  ClearPremoves,
  SparePiece,
  ChessboardDnDProvider,
} from "../src";
import { CustomSquareProps, Piece, Square } from "../src/chessboard/types";
import Engine from "./stockfish/engine";

const buttonStyle = {
  cursor: "pointer",
  padding: "10px 20px",
  margin: "10px 10px 0px 0px",
  borderRadius: "6px",
  backgroundColor: "#f0d9b5",
  border: "none",
  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.5)",
};

const inputStyle = {
  padding: "10px 20px",
  margin: "10px 0 10px 0",
  borderRadius: "6px",
  border: "none",
  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.5)",
  width: "100%",
};

const boardWrapper = {
  width: `70vw`,
  maxWidth: "70vh",
  margin: "3rem auto",
};

const meta: Meta<typeof Chessboard> = {
  title: "Chessboard",
  component: Chessboard,
  decorators: [
    (Story) => (
      <div style={boardWrapper}>
        <Story />
      </div>
    ),
  ],
};
export default meta;



export const Default = () => {
  const [chess, setChess] = useState<Chess>(new Chess(
    "8/8/8/5K2/2P5/3k4/8/8 b - - 0 1",
    1,
    1,
    { x: 1, y: 1 },
    { x: 1, y: 1 }
  ))

  if (chess.getGameStatus() !== GameStatus.IN_PROGRESS) {
    alert(chess.getGameStatus())
  }

  return <Chessboard
    id="defaultBoard"
    modifiedFen={chess.getCurrentFen()}
    boardOrientation="white"
    onMove={(move: Move) => {
      const chessCopy = chess.new()
      const valid = chessCopy.moveFromBoard({
        moveType: move.type,
        sourceSquare: move.sourceSquare,
        targetSquare: move.targetSquare,
        piece: move.piece,
        expandLocation: move.expandLocation
      })
      if (valid) {
        setChess(chessCopy)
        return true
      }

      return false
    }}
    areArrowsAllowed={false}
    arePremovesAllowed={false}
    horizontalAddUnit={{ x: 1, y: 1 }}
    verticalAddUnit={{ x: 1, y: 1 }}
    horizontalExtendLimit={1}
    verticalExtendLimit={1}
  />;
};
