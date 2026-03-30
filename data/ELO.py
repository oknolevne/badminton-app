#https://docs.google.com/spreadsheets/d/1gIzZAId-G8BjjxFYfCvaQ5WGEHgYmDkgizzLmw7dx5c/edit?gid=0#gid=0
import pandas as pd

def getEloFromId(id):
    #print(id)
    return Jmena_Id_Elo[Jmena_Id_Elo['Id'] == id]['Elo'].values[0]

def getNameFromId(id):
    return Jmena_Id_Elo[Jmena_Id_Elo['Id'] == id]['Jmeno'].values[0]

def updateElo(teamIds, deltaR):
    Jmena_Id_Elo.loc[Jmena_Id_Elo['Id'] == teamIds[0], 'Elo'] += int(deltaR)
    Jmena_Id_Elo.loc[Jmena_Id_Elo['Id'] == teamIds[1], 'Elo'] += int(deltaR)

    #Jmena_Id_Elo[Jmena_Id_Elo['Id'] == teamIds[0]]["Elo"] += deltaR
    #Jmena_Id_Elo[Jmena_Id_Elo['Id'] == teamIds[1]]["Elo"] += deltaR

def ComputeElo(team1, score1, team2, score2):

    team1Elo = (getEloFromId(team1[0]) + getEloFromId(team1[1]))/2   #zde prumer, asi to bude chtit zmenit
    team2Elo = (getEloFromId(team2[0]) + getEloFromId(team2[1]))/2

    expectedTeam1 = 1/(1 + 10**((team2Elo - team1Elo)/1400))
    expectedTeam2 = 1 - expectedTeam1

    realTeam1 = score1/(score1 + score2)
    realTeam2 = 1 - realTeam1

    K = 100  #nastavovat nejak na pocet bodu ve hre?

    deltaEloTeam1 = K * (realTeam1 - expectedTeam1)
    deltaEloTeam2 = K * (realTeam2 - expectedTeam2)


    return [deltaEloTeam1, deltaEloTeam2]



sheet_id = "1gIzZAId-G8BjjxFYfCvaQ5WGEHgYmDkgizzLmw7dx5c"
sheet_name = "Zapasy"  # změň na název listu
urlZapasy = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={sheet_name}"
zapasy = pd.read_csv(urlZapasy)

sheet_name_elo = "Elo"
urlElo = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={sheet_name_elo}"
Jmena_Id_Elo = pd.read_csv(urlElo)


#print(f"{getNameFromId(35)} a jeho Elo {getEloFromId(35)}")
#for index, row in Jmena_Id_Elo.iterrows():
#    Jmeno = row["Jmeno"]
#    Id = row["Id"]
#    Elo = row["Elo"]
#    print(f"{Jmeno} s id {Id} ma elo {Elo}")
IDtoknow = 61
i = 1
for index, row in zapasy.iterrows():
    teams_id = str(row["Teamy"])
    score = str(row["Skore"])
    #print(i)
    team1 = [int(teams_id[0:2]), int(teams_id[2:4])]
    scoreTeam1 = int(score[0:2])
    team2 = [int(teams_id[4:6]), int(teams_id[6:8])]
    scoreTeam2 = int(score[2:4])


    #print(f"Team {Jmena_Id_Elo[Jmena_Id_Elo['Id'] == team1[0]]['Jmeno'].values[0]} a {Jmena_Id_Elo[Jmena_Id_Elo['Id'] == team1[1]]['Jmeno'].values[0]} hrali proti teamu {Jmena_Id_Elo[Jmena_Id_Elo['Id'] == team2[0]]['Jmeno'].values[0]} a {Jmena_Id_Elo[Jmena_Id_Elo['Id'] == team2[1]]['Jmeno'].values[0]} a skoncilo to {scoreTeam1}:{scoreTeam2}")
    deltaR = ComputeElo(team1, scoreTeam1, team2, scoreTeam2)
    team1_jmena = f"{getNameFromId(team1[0])} a {getNameFromId(team1[1])}"
    team2_jmena = f"{getNameFromId(team2[0])} a {getNameFromId(team2[1])}"
    print(f"{team1_jmena:<15} vs {team2_jmena:<15} body {scoreTeam1}:{scoreTeam2}  ELO update {deltaR[0]:<7.3f}:{deltaR[1]:.3f}")


    #if(team1[0] == IDtoknow or team1[1] == IDtoknow):
    #    print(deltaR[0])
    #elif(team2[0] == IDtoknow or team2[1] == IDtoknow):
    #    print(deltaR[1])
    #print(f"Team {Jmena_Id_Elo[Jmena_Id_Elo['Id'] == team1[0]]['Jmeno'].values[0]} a {Jmena_Id_Elo[Jmena_Id_Elo['Id'] == team1[1]]['Jmeno'].values[0]} dostava {deltaR[0]} Ela, team {Jmena_Id_Elo[Jmena_Id_Elo['Id'] == team2[0]]['Jmeno'].values[0]} a {Jmena_Id_Elo[Jmena_Id_Elo['Id'] == team2[1]]['Jmeno'].values[0]} dostava {deltaR[1]}")
    updateElo(team1, deltaR[0])
    updateElo(team2, deltaR[1])
    i = i + 1

print(Jmena_Id_Elo[['Jmeno', 'Elo', "Id"]].to_string(index=False))

