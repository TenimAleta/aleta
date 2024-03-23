import { useState } from "react";

const { default: Popup } = require("../../other/Popup");
const { default: TutorialContent } = require("./TutorialContent");

function TutorialPopup({ show, closed, setClosed }) {
    return (
        <>
            <Popup
                closed={closed}
                setClosed={setClosed}
            >
                <TutorialContent />
            </Popup>
        </>
    )
}

export default TutorialPopup;