import { useEffect } from "react";
import Pressable from "../../other/Pressable";

function PilarChooser(props) {
    const choosePilar = (caixaSelected, force_pilar=null) => {
        if (caixaSelected !== -1) {
            const pilar = force_pilar ? force_pilar :
                prompt("A quin pilar del tronc pertany (número)?", props.json[caixaSelected]?.pilar || "");

            if (isNaN(pilar)) {
                alert("El pilar ha de ser un número!")
                return;
            }
            
            props.setJsonOutput(prev => ({
                ...prev,
                [caixaSelected]: {
                    ...prev[caixaSelected],
                    pilar: parseInt(pilar) === prev[caixaSelected].pilar ? undefined : parseInt(pilar)
                }
            }))
        }
    }

    useEffect(() => {
        if (!props.popupClosed) return;

        // Define a function for the 'keydown' event
        const handleKeyDown = (event) => {
            // Check if the key is a number
            if (!isNaN(event.key)) {
                choosePilar(props.caixaSelected, event.key);
            }
        }

        // Attach the event listener
        window.addEventListener('keydown', handleKeyDown);

        // Clean up function
        return () => {
            // Remove the event listener when the component is unmounted
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [props.caixaSelected, props.popupClosed]) // update the event listener every time props.caixaSelected changes

    return props.show && (
        <Pressable className="boto" onClick={() => choosePilar(props.caixaSelected)}>
            <span role="img" aria-label="pilar">
                🔢
            </span>
            <div style={{
                position: 'absolute',
                left: 12,
                backgroundColor: 'rgba(173, 216, 230, 0.7)', // lightblue with 70% transparency
                fontSize: 10,
                padding: 3,
                borderRadius: 5,
                color: 'rgba(0, 0, 0, 0.7)', // black font with 70% transparency
            }}>
                Núm.
            </div>
        </Pressable>
    );
}

export default PilarChooser;