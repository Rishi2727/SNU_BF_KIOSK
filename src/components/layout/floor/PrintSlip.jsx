

export const getPrintData = (formattedData, t) => {
    const languageCode = localStorage.getItem("lang") === "ko" ? "ko" : "en";
    const commands = [];

    const padLabel = (label, width = 16) => label.padEnd(width, " ") + ": ";

    if (languageCode === "ko") {

        const labelWidths = {
            Room: 10,
            "School No": 11,
            Name: 11,
        };

        const getPaddedLabel = (labelKey) => {
            const translated = t(`translations.${labelKey}`);
            const width = labelWidths[labelKey] || 9;
            return padLabel(translated, width);
        };

        commands.push(
            { type: "alignment", value: "center" },
            { type: "medium_text" },
            { type: "korean_text", value: t("translations.SEOUL NATIONAL UNIVERSITY") },
            { type: "normal_text" },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "alignment", value: "left" },
        );

        // ✅ NAME ONLY IF AVAILABLE
        if (formattedData.USER_NAME) {
            commands.push(
                { type: "bold" },
                { type: "korean_text", value: getPaddedLabel("Name") },
                { type: "unbold" },
                { type: "korean_text", value: formattedData.USER_NAME },
                { type: "blank_line" }
            );
        }

        commands.push(
            { type: "bold" },
            { type: "korean_text", value: getPaddedLabel("School No") },
            { type: "unbold" },
            { type: "korean_text", value: formattedData.SCHOOL_NO },
            { type: "blank_line" },

            { type: "bold" },
            { type: "korean_text", value: getPaddedLabel("Room") },
            { type: "unbold" },
            { type: "korean_text", value: formattedData.ROOM },
            { type: "blank_line" },

            { type: "bold" },
            { type: "korean_text", value: getPaddedLabel("Seat No") },
            { type: "unbold" },
            { type: "korean_text", value: formattedData.SEAT_NO },
            { type: "blank_line" },

            { type: "bold" },
            { type: "korean_text", value: getPaddedLabel("Check in Time") },
            { type: "unbold" },
            { type: "korean_text", value: formattedData.CHECKIN_TIME },
            { type: "blank_line" },

            { type: "bold" },
            { type: "korean_text", value: getPaddedLabel("Check out Time") },
            { type: "unbold" },
            { type: "korean_text", value: formattedData.CHECKOUT_TIME },
            { type: "blank_line" },

            { type: "bold" },
            { type: "korean_text", value: getPaddedLabel("Booking Date") },
            { type: "unbold" },
            { type: "korean_text", value: formattedData.BOOKING_DATE },
            { type: "blank_line" },
            { type: "blank_line" },

            { type: "qr_code", value: formattedData.BARCODE },
            { type: "blank_line" },

            { type: "alignment", value: "left" },
            { type: "korean_text", value: t("translations.*Please return the seat assignment when you") },
            { type: "blank_line" },
            { type: "korean_text", value: t("translations.*It helps other people use it.") },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "full_cut" },
            { type: "clear_all" }
        );

    } else {

        commands.push(
            { type: "alignment", value: "center" },
            { type: "medium_text" },
            { type: "korean_text", value: t("translations.SEOUL NATIONAL") },
            { type: "blank_line" },
            { type: "korean_text", value: t("translations.UNIVERSITY") },
            { type: "normal_text" },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "alignment", value: "left" },
        );

        // ✅ NAME ONLY IF AVAILABLE
        if (formattedData.USER_NAME) {
            commands.push(
                { type: "bold" },
                { type: "korean_text", value: padLabel(t("translations.Name")) },
                { type: "unbold" },
                { type: "korean_text", value: formattedData.USER_NAME },
                { type: "blank_line" }
            );
        }

        commands.push(
            { type: "bold" },
            { type: "korean_text", value: padLabel(t("translations.School No")) },
            { type: "unbold" },
            { type: "korean_text", value: formattedData.SCHOOL_NO },
            { type: "blank_line" },

            { type: "bold" },
            { type: "korean_text", value: padLabel(t("translations.Room")) },
            { type: "unbold" },
            { type: "korean_text", value: formattedData.ROOM },
            { type: "blank_line" },

            { type: "bold" },
            { type: "korean_text", value: padLabel(t("translations.Seat No")) },
            { type: "unbold" },
            { type: "korean_text", value: formattedData.SEAT_NO },
            { type: "blank_line" },

            { type: "bold" },
            { type: "korean_text", value: padLabel(t("translations.Check in Time")) },
            { type: "unbold" },
            { type: "korean_text", value: formattedData.CHECKIN_TIME },
            { type: "blank_line" },

            { type: "bold" },
            { type: "korean_text", value: padLabel(t("translations.Check out Time")) },
            { type: "unbold" },
            { type: "korean_text", value: formattedData.CHECKOUT_TIME },
            { type: "blank_line" },

            { type: "bold" },
            { type: "korean_text", value: padLabel(t("translations.Booking Date")) },
            { type: "unbold" },
            { type: "korean_text", value: formattedData.BOOKING_DATE },
            { type: "blank_line" },
            { type: "blank_line" },

            { type: "qr_code", value: formattedData.USER_ID_QR },
            { type: "blank_line" },

            { type: "alignment", value: "left" },
            { type: "korean_text", value: t("translations.Please return the seat assignment when you") },
            { type: "blank_line" },
            { type: "korean_text", value: t("translations.-check out.") },
            { type: "blank_line" },
            { type: "korean_text", value: t("translations.*It helps other people use it.") },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "blank_line" },
            { type: "full_cut" },
            { type: "clear_all" }
        );
    }

    return { commands };
};