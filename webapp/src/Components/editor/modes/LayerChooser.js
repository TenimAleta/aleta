import { useEffect } from "react";
import Pressable from "../../other/Pressable";

function LayerChooser(props) {
    const chooseLayer = (caixaSelected, force_layer=null) => {
        if (caixaSelected !== -1) {
            const layer = force_layer ? force_layer :
                prompt("Introduce the name of the layer (pinya, folre, manilles...)", props.json[caixaSelected]?.layer || "");

            props.setJsonOutput({
                ...props.json,
                [caixaSelected]: {
                    ...props.json[caixaSelected],
                    pestanya: layer.toLowerCase()
                }
            })
        }
    }
    
    useEffect(() => {
        if (!props.popupClosed) return;

        // Define a function for the 'keydown' event
        const handleKeyDown = (event) => {
            if (event.key === 'P' || event.key === 'p') {
                chooseLayer(props.caixaSelected, 'pinya');
            } else if (event.key === 'F' || event.key === 'f') {
                chooseLayer(props.caixaSelected, 'folre');
            } else if (event.key === 'M' || event.key === 'm') {
                chooseLayer(props.caixaSelected, 'manilles');
            } else if (event.key === 'T' || event.key === 't') {
                chooseLayer(props.caixaSelected, 'tronc');
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

    return props.caixaSelected !== -1 && (
        <Pressable className="boto" onClick={() => chooseLayer(props.caixaSelected)}>
            <span role="img" aria-label="choose">
                🥞      
            </span>
        </Pressable>
    );
}

export default LayerChooser;