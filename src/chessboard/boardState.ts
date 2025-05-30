import { useState, useEffect } from 'react';

export const NON_EXISTENT_SQUARE = 'E';
export const EMPTY_SQUARE = 'e';
export const ANIMATION_DURATION = 300;

export type Square = {
    piece: string; // could be a piece or empty/non-existent square
    rank: string;
    file: string;
}

export type Row = Square[]
export type Col = Square[]
export type Idx = {
    row: number;
    col: number;
}

export type BoardState = {
    rows: Row[]
    locationToIdx: {
        [key: string]: Idx
    }
    locationToUnitSqIdxs: {
        [key: string]: Idx[]
    }
};

// This is the unit of squares player can add to the board.
//
// if x = 1, y = 1, then the unit is 1 square
// if x = 2, y = 2, then the unit is 4 squares (2x2)
// if x = 2, y = 1, then unit is a 2 squares as a 2x1 rectangle
type AddUnit = {
    x: number;
    y: number;
}

//TODO: rethink if we truly need these many methods
export interface BoardStateInterface {
    // Rendering board state
    getNumRows(): number;
    getNumCols(): number;
    getSquare(row: number, col: number): Square;
    getPiece(location: string): string;
    isLocationNonExistent(location: string): boolean;
    getBoard(): BoardState;
    getUnitSqIdxs(location: string): {
        row: number;
        col: number;
    }[];
    getLocationIdx(location: string): {
        row: number;
        col: number;
    };

    // Animation state
    getDiff(): {
        added: { [key: string]: string }
        removed: { [key: string]: string }
    };
    getIsWaitingForAnimation(): boolean;
    setManualDrop(wasManualDrop: boolean): void; // when set, it will not trigger animation

    // Moves
    movePiece(from: string, to: string, piece: string): void;
    materializeUnit(location: string): void

}
/**
 * Assumption about modifiedFen string: each row should have equal number of
 * squares. Ideally this should be handled here but to make life easier for now
 * I want the provider of modifiedFen to handle this.
 * 
 * Maybe I will handle it here in the future.
 */
export function useBoardState(
    modifiedFen: string,
    horizontalExtendLimit: number,
    verticalExtendLimit: number,
    horizontalAddUnit: AddUnit,
    verticalAddUnit: AddUnit
): BoardStateInterface {

    const [board, setBoard] = useState<BoardState>({
        rows: [[] as Square[]],
        locationToIdx: {}
    } as BoardState);
    const [diff, setDiff] = useState<{
        added: { [key: string]: string }
        removed: { [key: string]: string }
    }>({
        added: {},
        removed: {}
    });
    const [isWaitingForAnimation, setIsWaitingForAnimation] = useState(false);
    const [previousTimeout, setPreviousTimeout] = useState<NodeJS.Timeout | null>(null);
    const [wasManualDrop, setWasManualDrop] = useState(false);

    useEffect(() => {
        const newRows = modifiedFenToObj(modifiedFen);
        const newBoard = createBoard(
            newRows,
            horizontalExtendLimit,
            verticalExtendLimit,
            horizontalAddUnit,
            verticalAddUnit
        );
        const newPieceMap = locationToPieceMap(newRows);
        const oldPieceMap = locationToPieceMap(board.rows);
        const diff = getDifferences(oldPieceMap, newPieceMap);

        if (wasManualDrop) {
            setWasManualDrop(false);
            setBoard(newBoard);
            return;
        }

        if (isWaitingForAnimation) {
            // fen string changed while processing the earlier animation
            setIsWaitingForAnimation(false);
            setBoard(newBoard);
            if (previousTimeout) clearTimeout(previousTimeout);
            return;
        }

        setDiff(diff); // will trigger animation
        setIsWaitingForAnimation(true);
        const newTimeout = setTimeout(() => {
            setIsWaitingForAnimation(false);
            setBoard(newBoard);
        }, ANIMATION_DURATION);
        setPreviousTimeout(newTimeout);

    }, [
        modifiedFen, 
        horizontalExtendLimit, 
        verticalExtendLimit, 
        horizontalAddUnit, 
        verticalAddUnit
    ]);

    const getNumRows = () => {
        return board.rows.length;
    }

    const getNumCols = () => {
        return board.rows[0].length;
    }

    const getSquare = (row: number, col: number) => {
        return board.rows[row][col];
    }

    const movePiece = (from: string, to: string, piece: string) => {
        const fromIdx = board.locationToIdx[from];
        const toIdx = board.locationToIdx[to];
        if (!fromIdx || !toIdx) {
            return;
        }
        const oldPiece = board.rows[fromIdx.row][fromIdx.col].piece;
        if (oldPiece === EMPTY_SQUARE || oldPiece === NON_EXISTENT_SQUARE) {
            return;
        }
        const targetPiece = board.rows[toIdx.row][toIdx.col].piece;
        if (targetPiece === NON_EXISTENT_SQUARE) {
            return;
        }
        const newRows = [...board.rows];

        newRows[fromIdx.row][fromIdx.col].piece = EMPTY_SQUARE;
        newRows[toIdx.row][toIdx.col].piece = piece;

        setWasManualDrop(true);
        setBoard({
            ...board,
            rows: newRows,
        });
    }

    const getPiece = (location: string): string => {
        const idx = board.locationToIdx[location];
        if (!idx) {
            return "";
        }
        const piece = board.rows[idx.row][idx.col].piece;
        if (piece == EMPTY_SQUARE || piece == NON_EXISTENT_SQUARE) {
            return "";
        }
        return piece;
    }

    const getBoard = (): BoardState => {
        return board;
    }

    const materializeUnit = (location: string): void => {
        const idx = board.locationToIdx[location];
        if (!idx) {
            return;
        }
        const piece = board.rows[idx.row][idx.col].piece;
        if (piece !== NON_EXISTENT_SQUARE) {
            return;
        }
        const newRows = [...board.rows];
        const unitSqIdxs = board.locationToUnitSqIdxs[location];
        unitSqIdxs.forEach(unitSqIdx => {
            newRows[unitSqIdx.row][unitSqIdx.col].piece = EMPTY_SQUARE;
        });
        const newBoard = createBoard(
            newRows, 
            horizontalExtendLimit, 
            verticalExtendLimit, 
            horizontalAddUnit, 
            verticalAddUnit
        );
        setBoard(newBoard);
    }

    const getUnitSqIdxs = (location: string): Idx[] => {
        return board.locationToUnitSqIdxs[location];
    }

    const isLocationNonExistent = (location: string): boolean => {
        const idx = board.locationToIdx[location];
        if (!idx) {
            return false;
        }
        return board.rows[idx.row][idx.col].piece === NON_EXISTENT_SQUARE;
    }

    const getDiff = (): {
        added: { [key: string]: string }
        removed: { [key: string]: string }
    } => {
        return diff;
    }

    const getIsWaitingForAnimation = (): boolean => {
        return isWaitingForAnimation;
    }

    const setManualDrop = (wasManualDrop: boolean): void => {
        setWasManualDrop(wasManualDrop);
    }

    const getLocationIdx = (location: string): {
        row: number;
        col: number;
    } => {
        return board.locationToIdx[location];
    }

    return {
        getNumRows,
        getNumCols,
        getSquare,
        movePiece,
        getPiece,
        getBoard,
        materializeUnit,
        getUnitSqIdxs,
        isLocationNonExistent,
        getDiff,
        getIsWaitingForAnimation,
        setManualDrop,
        getLocationIdx,
    }

}

function getAllPossibleUnits(idx: Idx, addUnit: AddUnit): Idx[][] {
    if (addUnit.x == 1 && addUnit.y == 1) {
        return [[idx]]
    }
    return [
        getUnitUsingIdx(idx, { horizontal: 1, vertical: 1 }, addUnit),
        getUnitUsingIdx(idx, { horizontal: 1, vertical: -1 }, addUnit),
        getUnitUsingIdx(idx, { horizontal: -1, vertical: 1 }, addUnit),
        getUnitUsingIdx(idx, { horizontal: -1, vertical: -1 }, addUnit),
    ]
}

function getUnitUsingIdx(idx: Idx, direction: { horizontal: 1 | -1, vertical: 1 | -1 }, addUnit: AddUnit): Idx[] {
    const unit: Idx[] = [];
    for (let i = 0; i < addUnit.x; i++) {
        for (let j = 0; j < addUnit.y; j++) {
            unit.push({ row: idx.row + j * direction.vertical, col: idx.col + i * direction.horizontal });
        }
    }
    return unit;
}

function modifiedFenToObj(fen: string): Row[] {
    // cut off any move, castling, etc info from the end. we're only interested in position information
    fen = fen.replace(/ .+$/, "");
    const fenRows = fen.split("/");

    let currentRowIdx = getFenStartRowIdx(fenRows);
    let rows: Row[] = [];

    fenRows.forEach((fenRow) => {
        const parsedRow = fenRow.match(/\d+|[a-zA-Z]/g); // r10r -> ['r', '10', 'r']
        if (!parsedRow) return;

        let colIdx = getFenStartColIdx(fenRow);
        let row: Row = [];

        //TODO: clean this up later so we wont need so many layers of indentations
        parsedRow.forEach((unit) => {
            if (unit.search(/\d/) !== -1) { // number signifies empty squares
                const numEmptySquares = parseInt(unit, 10);
                for (let i = 0; i < numEmptySquares; i++) {
                    row.push({
                        piece: EMPTY_SQUARE,
                        rank: currentRowIdx.toString(),
                        file: getColumnNotation(colIdx)
                    })
                    colIdx += 1;
                }
            } else if (unit == NON_EXISTENT_SQUARE) {
                row.push({
                    piece: NON_EXISTENT_SQUARE,
                    rank: currentRowIdx.toString(),
                    file: getColumnNotation(colIdx)
                })
                colIdx += 1;
            } else { // if its not empty square or non-existent square, it must be a piece
                row.push({
                    piece: fenToPieceCode(unit),
                    rank: currentRowIdx.toString(),
                    file: getColumnNotation(colIdx)
                })
                colIdx += 1;
            }
        })

        rows.push(row);
        currentRowIdx -= 1;
    })

    return rows;
}

function createLocationToIdx(rows: Row[]): {
    [key: string]: {
        row: number;
        col: number;
    }
} {
    const locationToIdx: {
        [key: string]: {
            row: number;
            col: number;
        }
    } = {};

    rows.forEach((row, rowIdx) => {
        row.forEach((square, colIdx) => {
            locationToIdx[`${square.file}${square.rank}`] = {
                row: rowIdx,
                col: colIdx
            }
        })
    })

    return locationToIdx;
}

function getFenStartRowIdx(rows: string[]): number {
    const eighthRowIdx = rows.findIndex(row => row.startsWith('#'))
    if (eighthRowIdx === -1) return 8;
    return eighthRowIdx + 8;
}

function getFenStartColIdx(row: string): number {
    const aFileIdx = row.indexOf('$')
    if (aFileIdx === -1 || aFileIdx === 0) return 0;

    const beforeMarker = row.substring(0, aFileIdx)
    const beforeMarkerSplit = beforeMarker.match(/\d+|[a-zA-Z]/g)
    if (!beforeMarkerSplit) return 0;

    let squaresBeforeMarker = 0;
    for (let i = 0; i < beforeMarkerSplit.length; i++) {
        if (beforeMarkerSplit[i].search(/\d/) === -1) {
            squaresBeforeMarker += 1;
            continue;
        }
        squaresBeforeMarker += parseInt(beforeMarkerSplit[i], 10)
    }
    return -squaresBeforeMarker;
}

function getColumnNotation(fenColIdx: number): string {
    if (fenColIdx < 0) {
        return String.fromCharCode(64 + Math.abs(fenColIdx))
    }
    return String.fromCharCode(97 + fenColIdx)
}

function getFenColIdx(file: string): number {
    let charCode = file.charCodeAt(0)
    if (charCode >= 97) {
        return charCode - 97
    }
    return - (charCode - 64)
}

function fenToPieceCode(piece: string): string {
    // black piece
    if (piece.toLowerCase() === piece) {
        return ("b" + piece.toUpperCase());
    }
    // white piece
    return ("w" + piece.toUpperCase());
}

function createBoard(
    rawRows: Row[],
    horizontalExtendLimit: number,
    verticalExtendLimit: number,
    horizontalAddUnit: AddUnit,
    verticalAddUnit: AddUnit
): BoardState {
    const toAdd: {
        top: number,
        bottom: number,
        left: number,
        right: number
    } = {
        top: verticalAddUnit.y - numNonExistentRowsTopN(rawRows, verticalAddUnit.y),
        bottom: verticalAddUnit.y - numNonExistentRowsBottomN(rawRows, verticalAddUnit.y),
        left: horizontalAddUnit.x - numNonExistentColsLeftN(rawRows, horizontalAddUnit.x),
        right: horizontalAddUnit.x - numNonExistentColsRightN(rawRows, horizontalAddUnit.x)
    }
    const paddedRows = addNesPaddingToRows(rawRows, toAdd, horizontalExtendLimit, verticalExtendLimit)
    return {
        rows: paddedRows,
        locationToIdx: createLocationToIdx(paddedRows),
        locationToUnitSqIdxs: createLocationToUnitSqIdxs(paddedRows, horizontalAddUnit, verticalAddUnit)
    }
}

function areAllSqNonExistent(row: Square[]): boolean {
    return row.every((square) => square.piece === NON_EXISTENT_SQUARE)
}

function numNonExistentRowsTopN(rows: Row[], n: number): number {
    return rows.slice(0, n).filter(areAllSqNonExistent).length
}

function numNonExistentRowsBottomN(rows: Row[], n: number): number {
    return rows.slice(-n).filter(areAllSqNonExistent).length
}

function numNonExistentColsLeftN(rows: Row[], n: number): number {
    let cols: Col[] = []
    for (let i = 0; i < n; i++) {
        cols.push(rows.map(row => row[i]))
    }
    return cols.filter(areAllSqNonExistent).length
}

function numNonExistentColsRightN(rows: Row[], n: number): number {
    let cols: Col[] = []
    for (let i = 0; i < n; i++) {
        cols.push(rows.map(row => row[row.length - 1 - i]))
    }
    return cols.filter(areAllSqNonExistent).length
}

function addNesPaddingToRows(rows: Row[], toAdd: {
    top: number,
    bottom: number,
    left: number,
    right: number
}, horizontalExtendLimit: number, verticalExtendLimit: number): Row[] {

    const existingPadding = getExistingPadding(rows)
    const left = getPaddingToAdd(existingPadding.left, toAdd.left, horizontalExtendLimit)
    const right = getPaddingToAdd(existingPadding.right, toAdd.right, horizontalExtendLimit)
    const top = getPaddingToAdd(existingPadding.top, toAdd.top, verticalExtendLimit)
    const bottom = getPaddingToAdd(existingPadding.bottom, toAdd.bottom, verticalExtendLimit)

    const lrPaddedRows = rows.map(row => addLRNesPaddingToRow(row, left, right, horizontalExtendLimit))
    const paddedRows = addTBNesPaddingToRows(lrPaddedRows, top, bottom, verticalExtendLimit)
    return paddedRows
}

function getPaddingToAdd(existing:number, toAdd: number, limit:number): number {
    const total = existing + toAdd
    if (total > limit) {
        return limit - existing
    }
    return toAdd
}

function getExistingPadding(rows: Row[]): {
    top: number,
    bottom: number,
    left: number,
    right: number
} {
    const eighthRankIdx = rows.findIndex(row => row[0].rank === "8")
    if (eighthRankIdx === -1) {
        // should never happen since we always start off with normal board
        return {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        }
    }
    const aFileIdx = rows[0].findIndex(square => square.file === "a")
    if (aFileIdx === -1) {
        // should never happen since we always start off with normal board
        return {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        }
    }
    return {
        top: eighthRankIdx,
        bottom: rows.length - (8+eighthRankIdx),
        left: aFileIdx,
        right: rows[0].length - (8+aFileIdx)
    }
}

function nonExistentRow(rowLength: number, startingFenColIdx: number, rank: string): Row {
    const newRow: Row = []
    for (let i = 0; i < rowLength; i++) {
        let fenColIdx = startingFenColIdx + i
        newRow.push({
            piece: NON_EXISTENT_SQUARE,
            rank: rank,
            file: getColumnNotation(fenColIdx)
        })
    }
    return newRow
}

function addLRNesPaddingToRow(row: Row, left: number, right: number, horizontalExtendLimit: number): Row {
    const newRow: Row = []
    for (let i = 0; i < left; i++) {
        const offset = left - i
        const fenColIdx = getFenColIdx(row[0].file) - offset
        if (i + 1 > horizontalExtendLimit) {
            break;
        }
        newRow.push({
            piece: NON_EXISTENT_SQUARE,
            rank: row[0].rank,
            file: getColumnNotation(fenColIdx)
        })
    }
    row.forEach(square => {
        newRow.push(square)
    })
    for (let i = 0; i < right; i++) {
        const offset = i + 1
        const fenColIdx = getFenColIdx(row[row.length - 1].file) + offset
        if (i + 1 > horizontalExtendLimit) {
            break;
        }
        newRow.push({
            piece: NON_EXISTENT_SQUARE,
            rank: row[0].rank,
            file: getColumnNotation(fenColIdx)
        })
    }
    return newRow
}

function addTBNesPaddingToRows(rows: Row[], top: number, bottom: number, verticalExtendLimit: number): Row[] {
    const newRows: Row[] = []
    const rowLength = rows[0].length
    const startingFenColIdx = getFenColIdx(rows[0][0].file)
    const topRank = rows[0][0].rank
    const bottomRank = rows[rows.length - 1][0].rank

    for (let i = 0; i < top; i++) {
        const rank = (parseInt(topRank, 10) + top - i).toString()
        if (i + 1 > verticalExtendLimit) {
            break;
        }
        newRows.push(nonExistentRow(rowLength, startingFenColIdx, rank))
    }

    rows.forEach(row => {
        newRows.push(row)
    })

    for (let i = 0; i < bottom; i++) {
        const rank = (parseInt(bottomRank, 10) - i - 1).toString()
        if (i + 1 > verticalExtendLimit) {
            break;
        }
        newRows.push(nonExistentRow(rowLength, startingFenColIdx, rank))
    }
    return newRows
}

const isUnitValid = (rows: Row[], unit: Idx[]): boolean => {
    return unit.every(idx => {
        const row = rows[idx.row];
        if (!row) {
            return false
        }
        const sq = row[idx.col];
        if (!sq) {
            return false
        }
        return sq.piece === NON_EXISTENT_SQUARE;
    });
}

const computeUnitSqIdxs = (idx: Idx, rows: Row[], addUnit: AddUnit): Idx[] => {
    const allPossibleUnits = getAllPossibleUnits(idx, addUnit);
    const validUnits = allPossibleUnits.filter(unit => isUnitValid(rows, unit));
    if (validUnits.length === 0) {
        return []
    }
    return validUnits[0];
}

function createLocationToUnitSqIdxs(
    rows: Row[], 
    horizontalAddUnit: AddUnit, 
    verticalAddUnit: AddUnit
): { [key: string]: Idx[] } {
    const locationToUnitSqIdxs: { [key: string]: Idx[] } = {};
    rows.forEach((row, rowIdx) => {
        row.forEach((square, colIdx) => {
            if (square.piece !== NON_EXISTENT_SQUARE) {
                return;
            }
            const addUnit = getAddUnitByLocPrioVert(square.file, square.rank, horizontalAddUnit, verticalAddUnit);
            const unitSqIdxs = computeUnitSqIdxs({ row: rowIdx, col: colIdx }, rows, addUnit);
            locationToUnitSqIdxs[`${square.file}${square.rank}`] = unitSqIdxs;
        });
    });
    return locationToUnitSqIdxs;
}

function getAddUnitByLoc(file: string, rank: string, horizontalAddUnit: AddUnit, verticalAddUnit: AddUnit): AddUnit {
    if (file.charCodeAt(0) < 97 && file.charCodeAt(0) > 65) { // capital letters
        return horizontalAddUnit;
    }
    if (file.charCodeAt(0) > 68) { // letters beyond small h
        return horizontalAddUnit;
    }
    return verticalAddUnit;
}

function getAddUnitByLocPrioVert(file: string, rank: string, horizontalAddUnit: AddUnit, verticalAddUnit: AddUnit): AddUnit {
    if (parseInt(rank, 10) > 8 || parseInt(rank, 10) < 1) {
        return verticalAddUnit;
    }
    return horizontalAddUnit;
}

function locationToPieceMap(rows: Row[]): { [key: string]: string } {
    const locationToPieceMap: { [key: string]: string } = {};
    rows.forEach((row, rowIdx) => {
        row.forEach((square, colIdx) => {
            locationToPieceMap[`${square.file}${square.rank}`] = square.piece;
        });
    });
    return locationToPieceMap;
}

export function getDifferences(
    currPieceMap: { [key: string]: string },
    newPieceMap: { [key: string]: string }
): {
    added: { [key: string]: string };
    removed: { [key: string]: string };
} {
    const difference: { added: { [key: string]: string }; removed: { [key: string]: string } } = {
        removed: {},
        added: {},
    };

    // removed from current
    (Object.keys(currPieceMap) as Array<keyof typeof currPieceMap>).forEach(
        (square) => {
            if (newPieceMap[square] !== currPieceMap[square])
                difference.removed[square] = currPieceMap[square];
        }
    );

    // added from new
    (Object.keys(newPieceMap) as Array<keyof typeof newPieceMap>).forEach(
        (square) => {
            if (currPieceMap[square] !== newPieceMap[square])
                difference.added[square] = newPieceMap[square];
        }
    );

    return difference;
}
