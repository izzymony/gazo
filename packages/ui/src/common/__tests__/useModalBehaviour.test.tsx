import { useRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import useModalBehaviour from "../useModalBehaviour";

/** A minimal surface with its own chrome — the case Dialog cannot serve. */
function Harness({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <div ref={panelRef} tabIndex={-1} role="dialog" aria-label="Viewer">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onClose();
            }}>
            First
          </button>
          <button type="button">Last</button>
          <Behaviour
            isOpen={open}
            onClose={() => {
              setOpen(false);
              onClose();
            }}
            panelRef={panelRef}
          />
        </div>
      )}
    </>
  );
}

function Behaviour(props: Parameters<typeof useModalBehaviour>[0]) {
  useModalBehaviour(props);
  return null;
}

describe("useModalBehaviour", () => {
  it("locks the page behind it while open, and releases on close", async () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} />);
    expect(document.body.style.overflow).not.toBe("hidden");

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(document.body.style.overflow).toBe("hidden");

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("closes on Escape", async () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns focus to whatever opened it", async () => {
    render(<Harness onClose={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(document.activeElement).toBe(trigger);
  });

  it("moves focus into the surface on open", async () => {
    render(<Harness onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    // The panel takes focus itself; from there Tab reaches its contents.
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("wraps Tab at the end of the surface rather than escaping to the page", async () => {
    render(<Harness onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });

    last.focus();
    await userEvent.tab();
    expect(first).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(last).toHaveFocus();
  });
});
