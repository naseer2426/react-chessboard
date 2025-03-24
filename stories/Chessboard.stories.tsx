import React, { forwardRef, useEffect, useRef, useState, useMemo } from "react";
import { Meta } from "@storybook/react";
import { Chess } from "chess.js";
import { Move, MoveType } from "../src/chessboard/types";

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
  const [modifiedFen, setModifiedFen] = useState("#rnbqkbnr/Pppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR")

  const onMove = (
    move: Move,
  ): boolean => {
    setTimeout(() => {
      setModifiedFen("#rQbqkbnr/1ppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR")
    }, 500)
    return true
  }

  return <Chessboard
    id="defaultBoard"
    modifiedFen={modifiedFen}
    boardOrientation="white"
    // onMove={onMove}
    areArrowsAllowed={false}
    arePremovesAllowed={false}
    horizontalAddUnit={{ x: 2, y: 2 }}
    verticalAddUnit={{ x: 2, y: 2 }}
  />;
};
