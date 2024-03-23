// import { StyleSheet, PixelRatio } from "react-native";

// const styles = StyleSheet.create({
const styles = {
    plantilles_filter: {
        width: '90%',
        padding: '12px 20px',
        fontSize: '16px',
    },
    castellTitle: {
        fontSize: 36,
        margin: 10,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    proves: {
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderTopWidth: 1,
        borderStyle: 'solid',
        marginHorizontal: 0,
        paddingHorizontal: 0,
        backgroundColor: 'rgba(0,0,255,0.05)',
        padding: 10,
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    prova: {
        padding: 10,
        margin: 10,
        flex: 1,
        borderRadius: 5,
        backgroundColor: 'rgba(0,0,255,0.05)',
        display: 'flex',
        justifyContent: 'center',
    },
    provaText: {
        fontSize: 16,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center'
    }
};

export default styles;