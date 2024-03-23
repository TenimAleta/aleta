const parseTransformation = t => {
    let [a, b, c, d, x, y] = t;
    return `matrix(${a},${b},${c},${d},${x},${y})`;
};

const parseProps = props => {
    let parsedProps = {};
    
    parsedProps.transform = props.transform && parseTransformation(props.transform);

    return parsedProps;
};

function Text(props) {
    const { boxProps, textProps, textValue } = props;
    const [boxStyle, textStyle] = [boxProps, textProps].map(p => parseProps(p));
    
    return (
        <div style={boxStyle} className='aux-text'>
            <div style={textStyle} className="text">
                {textValue}
            </div>
        </div>
    );
}

export default Text;