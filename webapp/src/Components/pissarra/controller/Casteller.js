import React, { useState } from 'react'
import { isBrowser } from 'react-device-detect'

import useLongPress from '../../../utils/useLongPress'
import { panToCaixa } from '../PissarraController';

export const setPerfil = altura => {
    // Està 'undefined'
    if (altura === null) return "sense_altura";

    // Mesures/Perfils d'Arreplegats
    if (altura <= -10) return "Falca";
    else if (altura <= -3) return "Crossa";
    else if (altura <= 5) return "Baix";
    else if (altura <= 10) return "Lateral";
    else if (altura > 10) return "Rengla";

    return "sense_altura";
};

const getName = info =>
    (!!parseInt(info?.canalla) ? '👶 ' : '') +
    (!!parseInt(info?.music) ? '🥁 ' : '') +
    (!!parseInt(info?.lesionat) ? '🏥 ' : '') +
    (info.mote || `${info.nom} ${info.cognom[0] + '.' || ''}`)

function Casteller(props) {
    const { matched, assist, json, isNew, altura, altura_mans, id, panzoom, selected, posicions, panBack, castellerSelected, printed, setCastellerSelected, socket, arribaTard, surtAviat, isNovell } = props;
    const displayName = props.displayName ? props.displayName : getName(props)

    const [prevVal, setPrevVal] = useState(null)

    const assistName =
        assist === 2 ? 'Fitxat' :
        assist === 1 ? 'Vinc' :
        assist === 0 ? 'No-vinc' :
        'No-confirmat'

    const create_casteller = () => {
        const confirmation = window.confirm(`Esteu segurs que voleu crear un nou casteller "${displayName}"?`);
        if (!confirmation) return;
        
        socket.emit('.new_person', '-', '-', displayName, null, props.selectedBundle);
    }

    const selectCasteller = () => {
        if (isNew) {
            create_casteller()
        } else {
            const prevCaixa = posicions.castellers?.[id]
            const prevCaixaInfo = json[prevCaixa]
            const isTronc = prevCaixaInfo?.tronc || prevCaixaInfo?.pilar !== undefined

            if (isTronc) {
                const confirmation = window.confirm(`Esteu segurs que voleu treure "${displayName}" del tronc?`);
                if (!confirmation) return;
            }

            setCastellerSelected(prev => prev != id ? id : -1);
        }
    }

    const highlightCasteller = casteller_id => {
        if (isNew) return;

        // Prevent swapping castellers
        props.setCaixaSelected(-1);

        if (!(casteller_id in posicions.castellers)) return;
        const caixaToHighlight = posicions.castellers[casteller_id];

        // Set value when highlighting
        if (prevVal === null) setPrevVal([panzoom.getTransform().x, panzoom.getTransform().y])

        // Pan to caixa
        panToCaixa(caixaToHighlight, panzoom, isBrowser)
        // Highlight caixa
        document.querySelector(`#caixa-${caixaToHighlight}`)?.classList.add('highlighted');
    };
    const unhighlight = () => {
        // Pan to previously set value in highlight
        if (prevVal !== null) {
            // Disable panback
            // panzoom.smoothMoveTo(prevVal[0], prevVal[1])
            setPrevVal(null);

            // Prevent swapping castellers
            props.setCastellerSelected(-1)
        }

        // Remove highlighted
        document.querySelector('.highlighted')?.classList.remove('highlighted');
    }

    const longPressEvent = useLongPress(
        () => highlightCasteller(id),
        () => unhighlight(),
        500
    );

    return (
        <div
            id={`casteller-${id}`}
            onClick={() => selectCasteller()}
            /*onLongPress=*/{...longPressEvent}
            className={`casteller ${matched ? 'matched' : ''} ${surtAviat ? 'aviat' : ''} ${arribaTard ? 'tard' : ''} ${setPerfil(altura)} ${selected ? 'selected' : ''} ${printed ? 'noseleccionable' : ''}`}
        >
            <div className="nom">{displayName}</div>
            { altura !== null && <div className="altura">{altura}</div> }
            { altura_mans !== null && altura_mans !== undefined && <div className={`individual-display relative`} style={{ backgroundColor: '#FAAB78', fontSize: 12 }}>{altura_mans}</div> }
        </div>
    );
}

export default React.memo(Casteller, (props, newProps)=> {
    const oldSelComparison = props.castellerSelected === props.id;
    const newSelComparison = newProps.castellerSelected === newProps.id;

    const infoHasNotChanged = props.castellersInfo === newProps.castellersInfo;
    const printedHasNotChanged = props.printed === newProps.printed;
    const matchedHasNotChanged = props.matched === newProps.matched;
    const myPositionHasNotChanged =
        (props.id in props.posicions.castellers || props.id in newProps.posicions.castellers) ?
            (props.id in props.posicions.castellers === props.id in newProps.posicions.castellers)
            && (props.posicions.castellers[props.id] === newProps.posicions.castellers[props.id])
        :
            false

    // Do not re-render if...
    return oldSelComparison === newSelComparison && infoHasNotChanged && printedHasNotChanged && myPositionHasNotChanged && matchedHasNotChanged;
});