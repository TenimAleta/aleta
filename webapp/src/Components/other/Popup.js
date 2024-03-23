import './Popup.css'

function Popup(props) {
    const { children, closed, setClosed, width } = props;
    
    if (!closed) {
        return (
            <div className="modal" onClick={e => e.target === e.currentTarget && setClosed(true)}>
                <div className="modal-content" style={{ width: width ? width : '80%' }}>
                    <span className="close" onClick={() => setClosed(true)}>&times;</span>
                    <div>{children}</div>
                </div>
            </div>
        );
    }
}

export default Popup;