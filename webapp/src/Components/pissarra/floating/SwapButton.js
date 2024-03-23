import { useCallback, useEffect, useState } from "react";

function SwapButton(props) {
    const { caixaSelected, setCaixaSelected, lastCaixes, setLastCaixes, posicions } = props;

    const swap = (props) => {
        const { socket, castell, posicions } = props;
        const castellerPrev = posicions.caixes[lastCaixes.prev];
        const castellerCurr = lastCaixes.current in posicions.caixes ? posicions.caixes[lastCaixes.current] : '_EMPTY_';

        // Set same action_id for both changes
        const action_id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        if (castellerPrev !== -1) socket.emit('.save_change', `${lastCaixes.current},${castellerPrev}`, action_id);
        if (castellerCurr !== -1) socket.emit('.save_change', `${lastCaixes.prev},${castellerCurr}`, action_id);

        setCaixaSelected(-1);
    }

    const areSame = lastCaixes.prev === lastCaixes.current;
    const areBothCaixes = lastCaixes.prev !== -1 && lastCaixes.current !== -1;
    const prevHadAssigned = lastCaixes.prev in posicions.caixes;
    const possibleSwap = !areSame && areBothCaixes && prevHadAssigned;

    useEffect(() => {
        const swapWithEnter = ev => (ev.key === 'Enter' && possibleSwap) && swap(props)
        document.addEventListener('keyup', swapWithEnter);
        return () => document.removeEventListener('keyup', swapWithEnter);
    }, [possibleSwap]);

    useEffect(() => setLastCaixes(prevLastCaixes => {
        const emptyCaixa = caixaSelected !== -1 && !(lastCaixes.current in posicions.caixes);
        return { 'prev': emptyCaixa && prevLastCaixes.current !== -1 ? prevLastCaixes.prev : prevLastCaixes.current, 'current': caixaSelected };
    }), [caixaSelected]);

    useEffect(() => {
        const toSwapEl = document.querySelector('.toSwap');
        const caixaEl = document.querySelector(`#caixa-${lastCaixes.prev}`);

        if (possibleSwap) {
            if (toSwapEl) toSwapEl.classList.remove('toSwap');
            if (caixaEl) caixaEl.classList.add('toSwap');
        } else {
            if (toSwapEl) toSwapEl.classList.remove('toSwap');
        }
    }, [possibleSwap, lastCaixes]);

    return (
        <div
            className={`floating-button swap ${!possibleSwap ? 'hidden' : ''}`}
            onClick={() => swap(props)}
        >
            { !(lastCaixes.current in posicions.caixes) ? <>&#10145;&#65039;</> : <>🔃</> }
        </div>
    );
}

export default SwapButton;