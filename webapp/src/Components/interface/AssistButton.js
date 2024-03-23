import styles from "./Events.styles";

function AssistButton(props) {
    const { event, user, socket, assistencia } = props;

    const parseColor = assist => {
        if (assist === "Vinc") return 'green';
        else if (assist === "No vinc") return 'red';
        else if (assist === "Fitxat") return '#2859A8';
        else return 'orange';
    };

    const confirmar = (assistencia, resposta) => {
        const update = assistencia !== "No confirmat";
        socket.emit('.confirmar', event, user, resposta, update, true);
    };

    return (
        <div style={styles.assist_controls}>
            <div style={styles.assist_child}><span style={{ fontWeight: 'bold', color: parseColor(assistencia) }}>{assistencia}</span></div>
            { props.current && <div style={{...styles.assist_child, ...styles.assist_btn}}><button onPress={() => confirmar(assistencia, 2)}><span style={{ fontWeight: assistencia === 'Fitxat' ? 'bold' : 'regular' }}>He arribat</span></button></div> }
            { !props.current && <div style={{...styles.assist_child, ...styles.assist_btn}}><button onPress={() => confirmar(assistencia, 1)}><span style={{ fontWeight: assistencia === 'Vinc' ? 'bold' : 'regular' }}>Vinc</span></button></div> }
            <div style={{...styles.assist_child, ...styles.assist_btn}}><button onPress={() => confirmar(assistencia, 0)}><span style={{ fontWeight: assistencia === 'No vinc' ? 'bold' : 'regular' }}>No vinc</span></button></div>
        </div>
    );
}

export default AssistButton;