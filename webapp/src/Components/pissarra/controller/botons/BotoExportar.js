import Pressable from "../../../other/Pressable";

const share_pinya = (link) => prompt('Copia el link i envia\'l a la colla. (No edició).', link);

function BotoExportar(props) {
    const share_link = window.location.href.replace("edit/", "").replace("edit", "");

    return (
        <Pressable id="exportar-container" style={{ backgroundColor: 'rgba(0, 0, 255, 0.2)' }} className={`boto boto-save ${props.disabled ? 'disabled' : ''}`}>
            <a style={{ textDecoration: 'none' }} href={share_link} target='_blank'>&#128279;</a>
        </Pressable>
    );
}

export default BotoExportar;