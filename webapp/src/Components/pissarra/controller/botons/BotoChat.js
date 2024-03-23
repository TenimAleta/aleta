import { useEffect } from "react";
import { useState } from "react";

function BotoChat({ disabled, setPopupClosed }) {
    return (
        <div className={`boto boto-chat ${disabled ? 'disabled' : ''}`}>
            <div onClick={() => setPopupClosed(false)}>💬</div>
        </div>
    )
}

export default BotoChat;