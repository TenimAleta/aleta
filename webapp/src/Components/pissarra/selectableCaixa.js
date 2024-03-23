import { useState } from "react";
import useDoubleTap from "../../utils/useDoubleTap";

const selectCaixa = (ev, pointerPos, props) => {
    const isClick = (ev.clientX - pointerPos[0])**2 + (ev.clientY - pointerPos[1])**2 < 25*25;
    // TODO: change toString() to something more robust
    if (isClick) props.setCaixaSelected(props.hasClone ? props.clone.toString() : props.id);
};

const getConfirmatClass = (assistencia, assignat) => {
    if (parseInt(assistencia) === 2) return "fitxat";
    else if (parseInt(assistencia) === 1) return "ve";
    else if (parseInt(assistencia) === 0) return "no-ve";
    else return "no-sap-si-ve";
};

function SelectableCaixa(props) {
    const { openLlista, assistencia, isModel, setTriggerClick, opacity, children, hasClone, disabled, selected, readonly, arribenTard, surtenAviat, swiper, setExtended, caixaSelected } = props;
    const [pointerPos, setPointerPos] = useState([0,0]);

    const pointFinish = (ev, pointerPos) => {
        selectCaixa(ev, pointerPos, props);
        setTriggerClick(prev => !prev)
    }

    const isSelected = selected || (hasClone && caixaSelected === props.clone.toString())

    const confirmatClass = props.assignat in props.castellersInfo ? getConfirmatClass(assistencia, props.assignat) : '';
    const simpleConfirmatClass = confirmatClass === 'no-ve' ? 'no-ve' : 'regular'

    const arribaTard = props.assignat ? confirmatClass === 've' && arribenTard.includes(props.assignat) : false
    const surtAviat = props.assignat ? (confirmatClass === 've' || confirmatClass === 'fitxat') && surtenAviat.includes(props.assignat) : false

    const handlePointerDown = (ev) => {
        if (readonly) return;
        setPointerPos([ev.clientX, ev.clientY]);
    }

    const doubleTap = useDoubleTap((event) => {
        if (readonly) return;
        setExtended(true)
        openLlista();
        setTriggerClick(prev => !prev)
    }, 300, {
        singleTap: ev => (!readonly) ? pointFinish(ev, pointerPos) : null
    });

    return (
        <div
            className={`selectable ${hasClone ? 'hasclone' : ''} ${disabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''} ${(!isModel && !readonly && !arribaTard && !surtAviat) ? confirmatClass : simpleConfirmatClass} ${arribaTard ? 'tard' : ''} ${surtAviat ? 'aviat' : ''}`}
            onPointerDown={handlePointerDown}
            {...doubleTap}
            style={{
                opacity: opacity
            }}
        >
            {children}
        </div>
    );
}

export default SelectableCaixa;