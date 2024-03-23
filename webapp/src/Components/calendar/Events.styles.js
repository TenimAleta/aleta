// import { StyleSheet, PixelRatio } from "react-native";

// const styles = StyleSheet.create({
const styles = {
    llistes_container: {
        margin: 20
    },
    events_container: {
        flex: 1,
        paddingTop: 20,
        paddingBottom: 20,
    },
    event_container: {
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "black",
        borderRadius: 5,
        padding: 5,
        margin: 10,
        flex: 1,
    },
    data: {
        fontWeight: "bold"
    },
    assist_controls: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: "space-around",
        marginTop: 5
    },
    assist_child: {
        margin: 5,
        padding: 5,
    },
    assist_btn: {
        backgroundColor: 'white'
    },
    event: {
    },
    eventInfo: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginVertical: 2,
    },
    eventTitle: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    eventDescription: {
        paddingBottom: 5
    },
    emoji: {
        marginRight: 5,
    },
    info_content: {
        flex: 1,
    },
    event_content: {
        padding: 0
    },
    event_info: {
        padding: 15
    },
    event_proves: {
    },
    event_choose_type: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20
    },
    delete_event_button: {
        backgroundColor: '#ffaaaa',
        color: 'white',
        padding: 10,
        borderRadius: 5,
        cursor: 'pointer',
        margin: '10px 0',
        shadow: '0 0 5px #000',
        width: '95%',
        textAlign: 'center',
    },
};

export default styles;