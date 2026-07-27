const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsSection.tsx', 'utf8');

code = code.replace(
  "setPlots(await resPlots.json());",
  "setPlots(await resPlots.json());\n        setTransactions(await resTx.json());"
);

const filteredTransactions = `
  const filteredTransactions = transactions.filter(tx => {
    if (selectedCycleId && tx.cycleId !== parseInt(selectedCycleId)) return false;
    // Assuming transactions might not be linked to plots directly, we link via cycle.
    if (selectedPlotId) {
      const cycle = cycles.find(c => c.id === tx.cycleId);
      if (!cycle || cycle.plotId !== parseInt(selectedPlotId)) return false;
    }
    return true;
  });
`;

code = code.replace(
  "const filteredHarvests = harvests.filter(harvest => {",
  filteredTransactions + "\n  const filteredHarvests = harvests.filter(harvest => {"
);

fs.writeFileSync('src/components/ReportsSection.tsx', code);
