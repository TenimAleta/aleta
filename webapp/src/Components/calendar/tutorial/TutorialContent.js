import React, { useState } from 'react';

const TutorialContent = () => {
    const [showCreateSteps, setShowCreateSteps] = useState(false);

    return (
        <div>
            <h2>Com connectar el calendari de Google de la colla amb Aleta</h2>
            <div>
                {
                    !showCreateSteps && <>
                        <button
                            onClick={() => setShowCreateSteps(true)}
                        >
                            No tens calendari? - Mostra com crear un calendari (passos 1 i 2)
                        </button>
                    </>
                }

                {
                    showCreateSteps && <>
                        <button
                            onClick={() => setShowCreateSteps(false)}
                        >
                            Amaga els passos per crear un calendari
                        </button>
                        <div
                            style={{
                                textAlign: 'center',
                            }}
                        >
                            <h3>Pas 1: Crear el calendari</h3>
                            <img width="80%" src={require("./steps/1.png")} />
                            <p>Creeu el calendari de la colla amb el botó '+' abaix a la dreta.</p>
                        </div>
                        <div
                            style={{
                                textAlign: 'center',
                            }}
                        >
                            <h3>Pas 2: Posar-li nom i descripció</h3>
                            <img width="80%" src={require("./steps/2.png")} />
                            <p>Poseu-li nom i descripció. Vegeu l'exemple per referència.</p>
                        </div>

                        <hr />
                    </>
                }
                <div
                    style={{
                        textAlign: 'center',
                    }}
                >
                    <h3>Pas 3: Busqueu el botó de compartir</h3>
                    <img width="80%" src={require("./steps/3.png")} />
                    <p>Un cop creat, dins a Configuració, busqueu el botó de compartir el calendar amb altra gent.</p>
                </div>
                <div
                    style={{
                        textAlign: 'center',
                    }}
                >
                    <h3>Pas 4: Compartiu-lo amb l'Aleta</h3>
                    <img width="80%" src={require("./steps/4.png")} />
                    <p>Compartiu el calendari amb aquest correu (acabat amb <em>iam.gserviceaccount.com</em>).</p>
                    <input size="80%" type="text" value="calendar-key@calendar-sample-370523.iam.gserviceaccount.com" readonly />
                </div>
                <div
                    style={{
                        textAlign: 'center',
                    }}
                >
                    <h3>Pas 5: Apunteu-vos l'ID del calendari</h3>
                    <img width="80%" src={require("./steps/5.png")} />
                    <p>Ara copieu l'ID del calendari d'aquí (acabat amb <em>@group.calendar.google.com</em> o <em>@gmail.com</em>)</p>
                </div>
            </div>
            {/* <div>
                <h2>Connectar calendari</h2>
                <form action="./" method="GET">
                    <input name="calendar_id" size="80%" type="text" placeholder="ID del calendari (acabat amb @group.calendar.google.com)" />
                    <input type="submit" value="Connectar calendari" />
                </form>
            </div> */}
        </div>
    );
}

export default TutorialContent;
