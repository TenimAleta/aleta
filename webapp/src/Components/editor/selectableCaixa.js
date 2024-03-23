import { useState } from "react";

let pointerPos = [0,0];

const selectCaixa = (ev, props) => {
    const isClick = (ev.clientX - pointerPos[0])**2 + (ev.clientY - pointerPos[1])**2 < 25*25;
    if (isClick) props.setCaixaSelected(props.id);
};

const getConfirmatClass = casteller => {
    const assistencia = casteller["assistència"];
    if (parseInt(assistencia) === 2) return "fitxat";
    else if (parseInt(assistencia) === 1) return "ve";
    else if (parseInt(assistencia) === 0) return "no-ve";
    else return "no-sap-si-ve";
};

function SelectableCaixa(props) {
    const { submode, mode, setPosition, children, followPosition, setFollowPosition, disabled, selected, panzoom, json, setJsonOutput, readonly, arribenTard, surtenAviat } = props;

    const pointBegin = ev => pointerPos = [ev.clientX, ev.clientY];
    const pointFinish = ev => selectCaixa(ev, props);

    return (
        <div
            className={`selectable ${disabled ? 'disabled' : ''} ${(mode !== 'cordons' || submode === null) && selected ? 'selected' : ''}`}

            onPointerDown={pointBegin}
            onPointerUp={pointFinish}

            // onPointerDown={(ev) => {
            //     // panzoom.pause()
            //     setFollowPosition(props.id)
            // }}
        >
            {children}
        </div>
    );
}

export default SelectableCaixa;