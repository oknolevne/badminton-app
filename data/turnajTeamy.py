import mip


m = mip.Model(solver_name=mip.CBC)

idxToName = ["Martin", "Jindra", "Kony", "Klara", "Fanda", "Rutak", "Adam", "Stroblik", "Aik", "Anca", "Doki", "Stroj", "Tyna", "Dan", "Terka", "Bart"]

idxToElo = [1708, 1674, 1845, 1796, 1476, 1434, 1567, 1388, 1590, 1449, 1460, 1624, 1497, 1432, 1533, 1538]

n = len(idxToElo)

#vars
x = {(i,j): m.add_var(var_type=mip.BINARY)
     for i in range(n) for j in range(i+1, n)}

pairSums = {(i,j): idxToElo[i] + idxToElo[j] for (i,j) in x}

maxSum = m.add_var()
minSum = m.add_var()


M = max(pairSums.values())

for (i,j) in x:
    m += pairSums[i,j] * x[i,j] <= maxSum
    m += pairSums[i,j] * x[i,j] >= minSum - M * (1 - x[i,j])



#objective

m.objective = maxSum - minSum

#constraina na kazdyho cloveka jednou:
for i in range(n):
    m += mip.xsum(
        x[i,j] if (i,j) in x else x[j,i]
        for j in range(n) if i != j
    ) == 1

status = m.optimize()


# for (i,j), var in x.items():
#     if var.x > 0.5:
#         print(f"{idxToName[i]} and {idxToName[j]} | ELO sum = {pairSums[i,j]}")

# print("Max ELO diff:", int(maxSum.x - minSum.x))
best_obj = m.objective_value

solutions = []

#všechny ekvivalentní řešení
while status == mip.OptimizationStatus.OPTIMAL:
    # uložíme řešení
    sol = [(i,j) for (i,j), var in x.items() if var.x > 0.5]
    solutions.append(sol)
    print("Solution:", [(idxToName[i], idxToName[j]) for i,j in sol])

    # actualni reseni zakaze
    m += mip.xsum(var if var.x < 0.5 else (1 - var) for var in x.values()) >= 1

    # omezeni na stavajici optimum
    m += m.objective <= best_obj

    status = m.optimize()

print("------------------------------------------------------------------------------------------")

print("Found", len(solutions), "equivalent solutions with objective =", best_obj)
minTeamsDiffSolIdx = 0
minTeamsDiffSolNum = 10000
for idx, sol in enumerate(solutions, start=1):
    print(f"Solution {idx}:")
    teamsDiff = 0
    for idx2, (i, j) in enumerate(sol):
        print(f"  {idxToName[i]} + {idxToName[j]} | Sum {pairSums[i,j]}")
        for (k, l) in sol[idx2+1:]:
            teamsDiff = teamsDiff + abs(pairSums[i,j] - pairSums[k,l])
    if(teamsDiff < minTeamsDiffSolNum):
        minTeamsDiffSolIdx = idx
        minTeamsDiffSolNum = teamsDiff
    #print("Max ELO diff:", int(sol.maxSum.x - sol.minSum.x))
    print(f"Teams difference sum: {teamsDiff}")
    print("----")

print(f"Solution s nejmensi team difference: {minTeamsDiffSolIdx}")