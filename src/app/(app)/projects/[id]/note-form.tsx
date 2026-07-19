"use client";

import { useActionState, useRef } from "react";
import { addProjectNote } from "../actions";

export function NoteForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(addProjectNote, null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await formAction(fd);
        formRef.current?.reset();
      }}
      className="flex gap-2"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input
        name="note"
        placeholder="Add a note to the timeline…"
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none"
      />
      <button
        disabled={pending}
        className="shrink-0 rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        Post
      </button>
      {state?.error && (
        <p className="text-xs font-medium text-red-600">{state.error}</p>
      )}
    </form>
  );
}
