import Pressable from "../../other/Pressable";

function FontResizer(props) {
    const changeFontSize = (fnt_val) => {
        props.setJsonOutput({
            ...props.json,
            ['settings']: {
                ...props.json['settings'],
                fontSize: fnt_val
            }
        })
    }
    
    return props.show && (
        <Pressable className="boto" onClick={() => changeFontSize(prompt('Quina mida de lletra vols?'))}>
            <span role="img" aria-label="fontsize">
                Aa
            </span>
        </Pressable>
    );
}

export default FontResizer;