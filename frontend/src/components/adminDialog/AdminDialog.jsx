import {
    useEffect,
    useRef
} from "react";

import "./adminDialog.css";

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
].join(",");

function AdminDialog({
    children,
    className = "",
    backdropClassName = "",
    labelledBy,
    onClose
}) {
    const dialogRef =
        useRef(null);
    const onCloseRef =
        useRef(onClose);

    useEffect(() => {
        onCloseRef.current =
            onClose;
    }, [onClose]);

    useEffect(() => {
        const previousFocus =
            document.activeElement;
        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        const dialog =
            dialogRef.current;

        function getFocusableElements() {
            return dialog
                ? Array.from(
                    dialog.querySelectorAll(
                        FOCUSABLE_SELECTOR
                    )
                )
                : [];
        }

        const initialFocusableElements =
            getFocusableElements();

        (
            initialFocusableElements[0] ??
            dialog
        )?.focus();

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                event.preventDefault();
                onCloseRef.current();
                return;
            }

            if (event.key !== "Tab") {
                return;
            }

            const focusableElements =
                getFocusableElements();

            if (
                focusableElements.length ===
                0
            ) {
                return;
            }

            const firstElement =
                focusableElements[0];
            const lastElement =
                focusableElements[
                    focusableElements.length - 1
                ];

            if (
                event.shiftKey &&
                document.activeElement ===
                    firstElement
            ) {
                event.preventDefault();
                lastElement.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement ===
                    lastElement
            ) {
                event.preventDefault();
                firstElement.focus();
            }
        }

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
            document.body.style.overflow =
                previousOverflow;

            if (
                previousFocus instanceof
                HTMLElement
            ) {
                previousFocus.focus();
            }
        };
    }, []);

    function handleBackdropClick(event) {
        if (
            event.target ===
            event.currentTarget
        ) {
            onClose();
        }
    }

    return (
        <div
            className={`admin-dialog-backdrop ${backdropClassName}`.trim()}
            onMouseDown={handleBackdropClick}
        >
            <section
                ref={dialogRef}
                className={`admin-dialog ${className}`.trim()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                tabIndex={-1}
            >
                {children}
            </section>
        </div>
    );
}

export default AdminDialog;
