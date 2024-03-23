import { useEffect, useState } from "react"
import Popup from "../../other/Popup"
import UserList from "./UserList"
import LastChanges from "./LastChanges";

function WatchersModal({ colla, caixaSelected, setCaixaSelected, userInfo, userId, userDevices, closed, setClosed, socket, room, posicionsLog, castellersInfo }) {
    const tecnicaRole = castellersInfo?.[userId]?.es_tecnica

    const styles_scrollview = {
        height: 400,
        overflow: 'scroll',
    }

    return (
        <Popup
            closed={closed}
            setClosed={setClosed}
        >
            <h2>Estan mirant la pinya</h2>
            <UserList
                userDevices={userDevices}
                castellersInfo={castellersInfo}
                userId={userId}
            />
            {
                <div style={{ display: 'flex', padding: 10, gap: 10 }}>
                    { caixaSelected !== -1 && <h2 style={{ flex: 1 }}>Últims canvis fets a la caixa seleccionada ({caixaSelected.toString().slice(0,3)})</h2> }
                    <h2 style={{ flex: 1 }}>Últims canvis fets</h2>
                </div>
            }
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                }}
            >
                {
                    caixaSelected !== -1 && tecnicaRole >= 2 && <div style={{ flex: 1 }}>
                        <div style={styles_scrollview}>
                            <LastChanges
                                posicionsLog={posicionsLog}
                                castellersInfo={castellersInfo}
                                userId={userId}
                                caixaSelected={caixaSelected}
                                setCaixaSelected={setCaixaSelected}
                                colla={colla}
                            />
                        </div>
                    </div>
                }
                {
                    tecnicaRole >= 2 && <div style={{ flex: 1 }}>
                        <div style={styles_scrollview}>
                            <LastChanges
                                posicionsLog={posicionsLog}
                                castellersInfo={castellersInfo}
                                userId={userId}
                                setCaixaSelected={setCaixaSelected}
                                colla={colla}
                            />
                        </div>
                    </div>
                }
            </div>
        </Popup>

    )
}

export default WatchersModal;