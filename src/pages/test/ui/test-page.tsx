import { useReducer } from "react";

// --- Action Type 상수 ---
const UNDO_ACTION = {
  SET: "set",
  UNDO: "undo",
  REDO: "redo",
} as const;

// --- State / Action 타입 ---
type UndoState<T> = {
  past: T[];
  present: T;
  future: T[];
};

type UndoAction<T> =
  | { type: typeof UNDO_ACTION.SET; value: T }
  | { type: typeof UNDO_ACTION.UNDO }
  | { type: typeof UNDO_ACTION.REDO };

// --- Reducer (컴포넌트 바깥에 선언 — 순수 함수) ---
function undoReducer<T>(
  state: UndoState<T>,
  action: UndoAction<T>,
): UndoState<T> {
  switch (action.type) {
    case UNDO_ACTION.SET:
      return {
        past: [...state.past, state.present],
        present: action.value,
        future: [],
      };
    case UNDO_ACTION.UNDO: {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case UNDO_ACTION.REDO: {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

// --- 카운터 + Undo/Redo 데모 ---
function counterReducer(state: UndoState<number>, action: UndoAction<number>) {
  return undoReducer(state, action);
}

const INITIAL_STATE: UndoState<number> = {
  past: [],
  present: 0,
  future: [],
};

function UndoRedoCounter() {
  const [state, dispatch] = useReducer(counterReducer, INITIAL_STATE);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return (
    <div className="space-y-4">
      {/* 카운터 조작 */}
      <div className="flex items-center gap-4">
        <button
          className="rounded bg-gray-200 px-3 py-1 hover:bg-gray-300"
          onClick={() =>
            dispatch({ type: UNDO_ACTION.SET, value: state.present - 1 })
          }
        >
          -
        </button>
        <span className="min-w-12 text-center text-xl font-semibold">
          {state.present}
        </span>
        <button
          className="rounded bg-gray-200 px-3 py-1 hover:bg-gray-300"
          onClick={() =>
            dispatch({ type: UNDO_ACTION.SET, value: state.present + 1 })
          }
        >
          +
        </button>
      </div>

      {/* Undo / Redo */}
      <div className="flex items-center gap-2">
        <button
          className="rounded bg-blue-100 px-3 py-1 hover:bg-blue-200 disabled:opacity-40"
          disabled={!canUndo}
          onClick={() => dispatch({ type: UNDO_ACTION.UNDO })}
        >
          Undo
        </button>
        <button
          className="rounded bg-blue-100 px-3 py-1 hover:bg-blue-200 disabled:opacity-40"
          disabled={!canRedo}
          onClick={() => dispatch({ type: UNDO_ACTION.REDO })}
        >
          Redo
        </button>
      </div>

      {/* 상태 시각화 */}
      <div className="space-y-1 text-sm text-gray-600">
        <p>
          past: [<span className="font-mono">{state.past.join(", ")}</span>]
        </p>
        <p>
          present: <span className="font-mono font-bold">{state.present}</span>
        </p>
        <p>
          future: [<span className="font-mono">{state.future.join(", ")}</span>]
        </p>
      </div>
    </div>
  );
}

export const TestPage = () => {
  return (
    <div className="space-y-6 p-8">
      <h1 className="text-2xl font-bold">useReducer — Undo/Redo 패턴</h1>
      <UndoRedoCounter />
    </div>
  );
};
