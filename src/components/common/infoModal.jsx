import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SPEECH } from "../../constants/speechSentences";
import { useVoice } from "../../context/voiceContext";


export default function InfoModal({ isOpen = true, onClose = () => { } }) {
    const { t } = useTranslation();
    const { speak, stop } = useVoice();

    // ORIGINAL CONTENT
    const allItems = [
        { header: t(SPEECH.INFO_MODAL.LANGUAGE_AND_NOTICES), text: t(SPEECH.INFO_MODAL.LANGUAGE_NOTICES_DESC) },
        { header: t(SPEECH.INFO_MODAL.DATE_TIME_FLOOR), text: t(SPEECH.INFO_MODAL.DATE_TIME_FLOOR_DESC) },
        { header: t(SPEECH.INFO_MODAL.LOGIN_METHODS), text: t(SPEECH.INFO_MODAL.LOGIN_METHODS_DESC) },
        { header: t(SPEECH.INFO_MODAL.NAVIGATION_BOOKING), text: t(SPEECH.INFO_MODAL.NAVIGATION_BOOKING_DESC) },
        { header: t(SPEECH.INFO_MODAL.FOOTER_TOOLS), text: t(SPEECH.INFO_MODAL.FOOTER_TOOLS_DESC) },
        { header: t(SPEECH.INFO_MODAL.BOOKING_POPUPS), text: t(SPEECH.INFO_MODAL.BOOKING_POPUPS_DESC) },
        { header: t(SPEECH.INFO_MODAL.GATE_CONFIRMATION), text: t(SPEECH.INFO_MODAL.GATE_CONFIRMATION_DESC) },
        { header: t(SPEECH.INFO_MODAL.GROUP_ROOM_BOOKING), text: t(SPEECH.INFO_MODAL.GROUP_ROOM_BOOKING_DESC) },
        { header: t(SPEECH.INFO_MODAL.MULTIPLE_BOOKING), text: t(SPEECH.INFO_MODAL.MULTIPLE_BOOKING_DESC) },
    ];

    // PAGINATION
    const ITEMS_PER_PAGE = 4;
    const paginatedPages = [];

    for (let i = 0; i < allItems.length; i += ITEMS_PER_PAGE) {
        paginatedPages.push({
            title: t(SPEECH.INFO_MODAL.INFORMATION),
            content: allItems.slice(i, i + ITEMS_PER_PAGE),
        });
    }

    const logs = paginatedPages;

    // STATE
    const [pageIndex, setPageIndex] = useState(0);

    // focusCursor follows: null -> 0 -> 1 -> ... ; null means "no highlighted element"
    const [focusCursor, setFocusCursor] = useState(null);

    // Track last spoken to avoid repeats
    const lastSpokenRef = useRef(null);

    // REFS for stable keyboard access
    const pageIndexRef = useRef(pageIndex);
    const focusCursorRef = useRef(focusCursor);

    useEffect(() => { pageIndexRef.current = pageIndex; }, [pageIndex]);
    useEffect(() => { focusCursorRef.current = focusCursor; }, [focusCursor]);

    // Safe speak wrapper
    const speakSafe = (text) => {
        if (!text) return;
        const textStr = String(text).trim();
        if (textStr && textStr !== lastSpokenRef.current) {
            speak(textStr);
            lastSpokenRef.current = textStr;
        }
    };

    // Update focus visuals
    const updateFocusVisuals = () => {
        const modalWrapper = document.querySelector(".info-modal-wrapper");
        const titleEl = document.querySelector(".info-modal-title");
        const closeBtn = document.querySelector(".info-modal-close");
        const detailItems = Array.from(document.querySelectorAll(".info-detail-item"));
        const prevBtn = document.querySelector(".info-prev-btn");
        const nextBtn = document.querySelector(".info-next-btn");

        // All focusable elements in order
        const allElements = [titleEl, closeBtn, ...detailItems, prevBtn, nextBtn].filter(Boolean);

        // Clear all outlines
        [modalWrapper, ...allElements].forEach((el) => {
            if (!el) return;
            el.style.outline = "none";
            el.style.borderRadius = "";
        });

        // Always show popup outline
        if (modalWrapper) {
            modalWrapper.style.outline = "6px solid #dc2f02";
            modalWrapper.style.borderRadius = "12px";
        }

        // If cursor is null -> don't highlight any of the elements (only popup outline)
        if (focusCursor === null) {
            return;
        }

        // Highlight current focused element
        const currentEl = allElements[focusCursor];
        if (currentEl) {
            currentEl.style.outline = "6px solid #dc2f02";
            currentEl.style.borderRadius = "6px";
            currentEl.scrollIntoView({ block: "nearest", inline: "nearest" });

            let txt = currentEl.innerText || currentEl.textContent || "";

            // Proper speech for close button (instead of "✕")
            if (currentEl === closeBtn) {
                txt = t("speech.Close");
            }

            speakSafe(txt);
        }
    };

    // Call updateFocusVisuals when focus state changes
    useEffect(() => {
        if (isOpen) {
            updateFocusVisuals();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusCursor, pageIndex, isOpen]);

    // ON OPEN
    useEffect(() => {
        if (!isOpen) {
            stop();
            return;
        }
        setPageIndex(0);
        setFocusCursor(null); // start with null per your requirement
        lastSpokenRef.current = null;

        // Speak the current page title once on open even though nothing is highlighted
        setTimeout(() => {
            speakSafe(logs[0].title);
        }, 100);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // PAGE SWITCH FUNCTIONS
    const goPrev = () => {
        setPageIndex((prev) => {
            const newIndex = (prev - 1 + logs.length) % logs.length;
            speakSafe(logs[newIndex].title);
            return newIndex;
        });
        setFocusCursor(null); // reset to null on page change
        lastSpokenRef.current = null;
    };

    const goNext = () => {
        setPageIndex((prev) => {
            const newIndex = (prev + 1) % logs.length;
            speakSafe(logs[newIndex].title);
            return newIndex;
        });
        setFocusCursor(null); // reset to null on page change
        lastSpokenRef.current = null;
    };

    // KEYBOARD HANDLER - Only Left/Right Arrow Keys and Enter
    useEffect(() => {
        if (!isOpen) return;

        const handle = (e) => {
            e.stopPropagation();
            const isLeft = e.key === "ArrowLeft";
            const isRight = e.key === "ArrowRight";
            const isEnter = e.key === "Enter";

            if (!isLeft && !isRight && !isEnter) return;

            const titleEl = document.querySelector(".info-modal-title");
            const closeBtn = document.querySelector(".info-modal-close");
            const detailItems = Array.from(document.querySelectorAll(".info-detail-item"));
            const prevBtn = document.querySelector(".info-prev-btn");
            const nextBtn = document.querySelector(".info-next-btn");

            const allElements = [titleEl, closeBtn, ...detailItems, prevBtn, nextBtn].filter(Boolean);

            if (allElements.length === 0) return;

            const lastIndex = allElements.length - 1;

            // Navigate right
            if (isRight) {
                e.preventDefault();
                setFocusCursor((prev) => {
                    // If currently null, first press goes to 0
                    if (prev === null) return 0;
                    // otherwise normal increment with wrap
                    return prev === lastIndex ? 0 : prev + 1;
                });
                return;
            }

            // Navigate left
            if (isLeft) {
                e.preventDefault();
                setFocusCursor((prev) => {
                    // If currently null, first press goes to 0
                    if (prev === null) return 0;
                    // otherwise normal decrement with wrap
                    return prev === 0 ? lastIndex : prev - 1;
                });
                return;
            }

            // ENTER to activate (only if cursor not null)
            if (isEnter) {
                e.preventDefault();
                const currentCursor = focusCursorRef.current;
                if (currentCursor === null) return; // nothing to activate

                const currentEl = allElements[currentCursor];

                if (currentEl === closeBtn) {
                    onClose();
                } else if (currentEl === prevBtn) {
                    goPrev();
                } else if (currentEl === nextBtn) {
                    goNext();
                } else {
                    // If a detail item or title was activated, you can define behavior here.
                    // Currently no onclick for detail items — if desired, implement here.
                }
            }
        };

        document.addEventListener("keydown", handle, true);
        return () => document.removeEventListener("keydown", handle, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, logs, onClose]);

    if (!isOpen) return null;

    // UI RENDER
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-999 flex justify-center items-center">
            <div className="info-modal-wrapper bg-white/95 w-[60%] h-[80%] flex flex-col rounded-3xl border shadow-2xl overflow-hidden">

                {/* HEADER */}
                <div className="bg-linear-to-r from-[#FFCB35] to-[#cf9e0b] text-white text-[35px] px-8 py-3 font-bold flex justify-between items-center">
                    <span className="info-modal-title cursor-pointer">
                        {logs[pageIndex].title}
                    </span>

                    <button
                        onClick={onClose}
                        className="info-modal-close text-[32px] font-bold hover:opacity-80 transition-opacity"
                    >
                        ✕
                    </button>
                </div>

                {/* DETAILS */}
                <div className="flex-1 px-5 py-3 bg-gray-50 overflow-y-auto space-y-2">
                    {logs[pageIndex].content.map((item, i) => (
                        <div
                            key={i}
                            className="info-detail-item p-4 bg-white rounded-2xl border shadow cursor-pointer hover:shadow-lg transition-shadow leading-10"
                        >
                            <div className="text-[31px] font-bold text-[#EFB637]">{item.header}</div>
                            <div className="text-[30px] text-gray-700">{item.text}</div>
                        </div>
                    ))}
                </div>

                {/* FOOTER */}
                <div className="info-buttons-container px-8 py-4 bg-white border-t flex justify-between items-center">
                    <button
                        onClick={goPrev}
                        className="info-prev-btn px-10 py-4 bg-[#EFB637] text-[30px] font-bold text-white rounded-2xl hover:bg-[#9A7D4C] transition-colors"
                    >
                        {t("translations.Previous")}
                    </button>

                    <div className="text-[32px] font-bold text-[#EFB637]">
                        {pageIndex + 1} / {logs.length}
                    </div>

                    <button
                        onClick={goNext}
                        className="info-next-btn px-10 py-4 bg-[#EFB637] text-[30px] font-bold text-white rounded-2xl hover:bg-[#9A7D4C] transition-colors"
                    >
                        {t("translations.Next")}
                    </button>
                </div>

            </div>
        </div>
    );
}
