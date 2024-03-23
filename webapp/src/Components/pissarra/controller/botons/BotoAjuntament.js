import Pressable from "../../../other/Pressable"

function BotoAjuntament({ socket, ajuntament, setAjuntament, hideAjuntament, setHideAjuntament, disabled }) {
    const rotate = () => {
        setHideAjuntament(false)

        const newVal = (ajuntament+1)%4
        socket.emit('.rotate_ajuntament', newVal)
        setAjuntament(newVal)
    }

    return ajuntament !== null && (
        <Pressable onClick={rotate} id="boto-ajuntament-container" style={{ transform: `rotate(${ajuntament*90}deg)`, backgroundColor: 'rgba(0, 255, 0, 0.2)' }} className={`boto boto-ajuntament ${disabled ? 'disabled' : ''}`}>
            <div>🏛️</div>
        </Pressable>
    );
}

export default BotoAjuntament;