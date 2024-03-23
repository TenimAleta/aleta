import { useEffect, useState } from 'react';
import { isBrowser } from 'react-device-detect';

export const panToCaixa = (caixa_id, pz, isBrowser) => {
    const caixa = document.getElementById(`caixa-${caixa_id}`);
    if (!caixa) return;
    
    pz.pause();
    pz.resume();

    // Calculate center of caixa
    let transform = pz.getTransform();
    let box_dims = caixa.getBoundingClientRect();
    let pissarra_width = document.querySelector(".pissarra-container").offsetWidth; 
    let pissarra_height = document.querySelector(".pissarra-container").offsetHeight;
    let center_box_x = -(box_dims.x - transform.x) + pissarra_width/2 - box_dims.width/2;
    let center_box_y = -(box_dims.y - transform.y) + pissarra_height/2 - box_dims.height/2;
    
    // In mobile, move a bit to the top
    if (!isBrowser) center_box_y -= pissarra_height/6;
    
    // In browser, 40% of the window size is occupied by the Controller
    if (isBrowser) center_box_x -= pissarra_width/6;

    // Move to caixa
    pz.smoothMoveTo(center_box_x, center_box_y);
}

function PissarraController(props) {
    const { caixaSelected, setCaixaSelected, lastCaixes, setLastCaixes, panzoom, socket } = props;

    useEffect(() => {
        // if (!isBrowser) panToCaixa(caixaSelected, panzoom, isBrowser);
        setLastCaixes({ 'prev': lastCaixes.current, 'current': caixaSelected });
    }, [caixaSelected]);

    /* KEYWORDS */
    document.querySelector('#root').onkeydown = (event) => {
        // if (event.which === 8 /* BACKSPACE */ || event.which === 46 /* DELETE */) {
        //     // Delete
        //     if (caixaSelected !== -1) socket.emit('.save_change', `${caixaSelected},_EMPTY_`);
        //     setCaixaSelected(-1);
        // } else 
        if (event.which === 27 /* ESCAPE */) {
            // Deselect caixa
            setCaixaSelected(-1);
        }
    };
}

export default PissarraController;