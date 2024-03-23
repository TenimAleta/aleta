import { useEffect } from "react";
import Pressable from "../../other/Pressable";

const rotateMatrix180degs = ([a, b, c, d, e, f]) => {
    return [
        -a, b, c, -d, e, f
    ]
}

function RotateText(props) {
    const rotateText = (caixaSelected) => {
        if (caixaSelected !== -1) {
            props.setJsonOutput(prev => ({
                ...prev,
                [caixaSelected]: {
                    ...prev[caixaSelected],
                    text: {
                        ...prev[caixaSelected].text,
                        transform: rotateMatrix180degs(prev[caixaSelected].text.transform),
                    }
                }
            }))
        }
    }

    useEffect(() => {
        if (!props.popupClosed) return;

        const handleKeyDown = (event) => {
            if (event.key === 'r' || event.key === 'R') {
                rotateText(props.caixaSelected);
            }
        }
        // Add the event listener when the component is mounted
        window.addEventListener('keydown', handleKeyDown);
        // Remove the event listener when the component is unmounted
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [props.caixaSelected, props.popupClosed]); // update the event listener every time props.caixaSelected changes

    return props.show && (
        <Pressable className="boto" onClick={() => rotateText(props.caixaSelected)}>
            <span role="img" aria-label="rotate">
                🔄
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
                R
            </div>
        </Pressable>
    );
}

export default RotateText;