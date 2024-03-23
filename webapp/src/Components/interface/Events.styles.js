// import { StyleSheet, PixelRatio } from "react-native";
import { isBrowser } from 'react-device-detect';

// const styles = StyleSheet.create({
const styles = {
    tabs: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        alignItems: 'center',
        margin: 10,
        padding: 10,
    },
    tab: {
        width: ( isBrowser ? 120 : 'auto' ),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        flexShrink: 1,
        textAlign: 'center',
        padding: 10,
        margin: 10,
        // borderStyle: 'solid',
        // borderWidth: 1,
        // borderColor: 'black',
        borderRadius: 5,
        backgroundColor: '#eee',
    },
    normal_link: {
        textDecoration: 'none',
        color: 'black',
    },
    llistes_container: {
        backgroundColor: '#f3f3f3',
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
    },
    events_container: {
        flex: 1,
        paddingTop: 8,
        paddingBottom: 10,
        // overflow: 'scroll',
        // height: 400,
        padding: 15,
    },
    event_container: {
        // borderStyle: "solid",
        // borderWidth: 1,
        // borderColor: "black",
        padding: 0,
        marginTop: 10,
        marginHorizontal: 10
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
        fontWeight: 'bold',
        paddingBottom: 10
    },
    emoji: {
        marginRight: 5,
    },
    info_content: {
        flex: 1,
    },
    event_content: {
        position: 'relative',
        padding: 0,
        borderRadius: 10,
        backgroundColor: 'white',
    },
    event_info: {
        padding: 15
    },
    event_proves: {
    },

    add_past_event: {
        padding: 10,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 5,
        backgroundColor: '#ccc',
        // borderWidth: 1,
        // borderColor: 'black',
        // borderStyle: 'solid'
    },
    add_past_event_text: {
        fontSize: 12
    },

    load_more: {
        marginTop: 20,
        padding: 15,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 5,
        backgroundColor: '#ccc',
        // borderWidth: 1,
        // borderColor: 'black',
        // borderStyle: 'solid'
    },
    load_more_text: {
        fontSize: 16
    },
};

export default styles;