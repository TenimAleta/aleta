import Pressable from "../../../other/Pressable";

function BotoUndo({ socket, posicionsLog }) {
    const disabled = posicionsLog?.length < 1

    const undo = () => {
        if (disabled) return;
        socket.emit('.undo');
    }

    return (
        <Pressable id="undo-container"
            onClick={undo}
            className={`boto boto-undo ${disabled ? 'disabled' : ''}`}
            style={{
                backgroundColor: 'rgba(200, 87, 0, 0.2)'
            }}
        >
            &#10554;
        </Pressable>
    );
}

export default BotoUndo;