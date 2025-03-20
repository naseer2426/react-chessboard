import { useChessboard } from "../context/chessboard-context";
import { PromotionPieceOption } from "../types";
import { PromotionOption } from "./PromotionOption";

export function PromotionDialog() {
  const {
    boardOrientation,
    boardWidth,
    promotionDialogVariant,
    promoteToSquare,
    boardState,
  } = useChessboard();

  const promotePieceColor = promoteToSquare?.[1] === "1" ? "b" : "w";
  const promotionOptions: PromotionPieceOption[] = [
    `${promotePieceColor ?? "w"}Q`,
    `${promotePieceColor ?? "w"}R`,
    `${promotePieceColor ?? "w"}N`,
    `${promotePieceColor ?? "w"}B`,
  ];

  const dialogStyles = {
    default: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      transform: `translate(${-boardWidth / 8}px, ${-boardWidth / 8}px)`,
    },
    vertical: {
      transform: `translate(${-boardWidth / 16}px, ${-boardWidth / 16}px)`,
    },
    modal: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      transform: `translate(0px, ${(3 * boardWidth) / 8}px)`,
      width: "100%",
      height: `${boardWidth / 4}px`,
      top: 0,
      backgroundColor: "white",
      left: 0,
    },
  };
  /* 
    Promotion dialog is only rendered when user drags a pawn to the last row.
    Opponents moves will be handled by animation using position differences and will
    not be use drop event.

    This function will render the promotion dialog in the wrong place
    if the player has set board orientation to opposite of what he is playing.

    I have consciously chosen this to keep this function simple and always set
    top as sqWidth/2.

    This is because I am not planning to add support for board orientation editing
    and your board will automatically be oriented to your playing side.
  */
  const getDialogRelativeCoords = (
    boardOrientation: "black" | "white",
    initialBoardWidth: number,
    promoteToSquare: string
  ): { top: number, left: number } => {
    const location = boardState.getLocationIdx(promoteToSquare);
    const sqWidth = initialBoardWidth / 8;
    const topLeftSq = boardOrientation === "white" ? "a8" : "h1";
    const topLeftLoc = boardState.getLocationIdx(topLeftSq);
    const leftOffset = topLeftLoc.col - location.col;

    const leftMultiplier = boardOrientation === "white" ? -1 : 1;
    return {
      top: sqWidth / 2,
      left: leftMultiplier * (leftOffset * sqWidth) + sqWidth / 2,
    }
  }

  const dialogCoords = getDialogRelativeCoords(
    boardOrientation,
    boardWidth,
    promoteToSquare || "a8"
  );

  return (
    <div
      style={{
        position: "absolute",
        top: `${dialogCoords?.top}px`,
        left: `${dialogCoords?.left}px`,
        zIndex: 1000,
        ...dialogStyles[promotionDialogVariant],
      }}
      title="Choose promotion piece"
    >
      {promotionOptions.map((option) => (
        <PromotionOption key={option} option={option} />
      ))}
    </div>
  );
}
