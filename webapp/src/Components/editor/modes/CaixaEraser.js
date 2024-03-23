import { useEffect } from "react";
import Pressable from "../../other/Pressable";

function CaixaEraser(props) {
    const deleteCaixa = (caixaSelected) => {
        if (caixaSelected !== -1) {
            const caixa_id = caixaSelected.toString().slice(0,3);
            if (window.confirm(`Estàs segur que vols eliminar la caixa ${caixa_id}?`)) {
                const newJson = {...props.json};
                delete newJson[caixaSelected];
                
                props.setJsonOutput(newJson);
            }
        }
    }


    useEffect(() => {
        if (!props.popupClosed) return;

        // Define a function for the 'keydown' event
        const handleKeyDown = (event) => {
            // Check if the key is "Backspace"
            if (event.key === "Backspace") {
                deleteCaixa(props.caixaSelected);
            }
        }

        // Attach the event listener
        window.addEventListener('keydown', handleKeyDown);

        // Clean up function
        return () => {
            // Remove the event listener when the component is unmounted
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [
        props.caixaSelected,
        props.popupClosed,
    ]) // update the event listener every time props.caixaSelected changes

    return props.show && (
        <Pressable className="boto" onClick={() => deleteCaixa(props.caixaSelected)}>
            <span role="img" aria-label="pilar">
                🗑️
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
                ⌫
            </div>
        </Pressable>
    );
}

export default CaixaEraser;