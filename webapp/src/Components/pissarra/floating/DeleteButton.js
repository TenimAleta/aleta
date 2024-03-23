import useLongPress from '../../../utils/useLongPress'

function DeleteButton(props) {
    const askToEraseNewCasteller = (props) => {
        const { socket, caixaSelected, posicions, castellersInfo } = props
        const casteller_id = posicions.caixes[caixaSelected]
        const casteller = castellersInfo?.[casteller_id]
        const isNew = casteller?.nom === '-' && casteller?.cognom === '-'

        if (isNew) {
            if (window.confirm(`Vols també eliminar per sempre el compte de ${casteller.mote}? És irreversible!`)) {
                socket.emit('.delete_user', { id: casteller_id })
            }
        }
    }

    const erasePosition = (props) => {
        const { castell, socket, caixaSelected, setCaixaSelected } = props;
        const action_id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        socket.emit('.save_change', `${caixaSelected},_EMPTY_`, action_id);
        setCaixaSelected(-1);
    };

    const handleClick = () => {
        askToEraseNewCasteller(props)

        // Erase the position
        erasePosition(props)
    }

    const hasAssignat = props => {
        const { caixaSelected, posicions } = props;
        return caixaSelected !== -1 && caixaSelected in posicions.caixes;
    };

    const deleteAllRed = ({ posicions, assistenciesEvent, castellersInfo, socket, caixaSelected, setCaixaSelected }) => {
        const isCaixaSelectedInRed = assistenciesEvent
            ?.find(a => a.id === posicions?.caixes?.[caixaSelected])
            ?.['assistència'] === 0

        if (!isCaixaSelectedInRed) return;

        const caixesInRed = Object.keys(posicions.caixes)
            .filter(caixaid => assistenciesEvent
                ?.find(a => a.id === posicions?.caixes?.[caixaid])
                ?.['assistència'] === 0
            )

        if (window.confirm("Segur que vols treure de la pinya tots els castellers que no vindran?")) {
            const action_id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            caixesInRed.forEach(caixaid => socket.emit('.save_change', `${caixaid},_EMPTY_`, action_id))
            setCaixaSelected(-1);
        }
    }

    const longPressEvent = useLongPress(
        () => deleteAllRed(props),
        () => undefined,
        500
    );

    return (
        <div
            className={`floating-button delete ${!hasAssignat(props) ? 'hidden' : ''}`}
            onClick={handleClick}
            /*onLongPress=*/{...longPressEvent}
        >
            &#128465;
        </div>
    );
}

export default DeleteButton;