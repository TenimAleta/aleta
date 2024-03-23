function FitxarButton(props) {
    const fitxar = (props) => {
        if (!hasAssignat(props)) return;
        const { socket, event, user, assistencia, setAssistencia } = props;
        
        if (assistencia === "Fitxat") {
            socket.emit('.confirmar', event, user, 0, true, true);  // Ha marxat
            setAssistencia("No vinc");
        } else if (assistencia === "No confirmat") {
            socket.emit('.confirmar', event, user, 2, false, true);  // Fitxat (insert)
            setAssistencia("Fitxat");
        } else if (assistencia === "No vinc") {
            socket.emit('.confirmar', event, user, 1, true, true);  // Vinc (possible tornada)
            setAssistencia("Vinc");
        } else {
            socket.emit('.confirmar', event, user, 2, true, true);  // Fitxat (update)
            setAssistencia("Fitxat");
        }
    };

    const hasAssignat = props => {
        const { caixaSelected, posicions } = props;
        return caixaSelected !== -1 && caixaSelected in posicions.caixes;
    };

    return (
        <div
            className={`floating-button fitxar ${!hasAssignat(props) || !props.assistencia ? 'hidden' : ''}`}
            style={{ color: 'black' }}
            onPointerUp={() => fitxar(props)}
        >
            {
                props.assistencia === "Fitxat" ? <>&#10060;</> :    // X
                props.assistencia === "No vinc" ? <>&#9989;</> :   // OK
                <>📍</>                                        // Pin
            }
        </div>
    );
}

export default FitxarButton;