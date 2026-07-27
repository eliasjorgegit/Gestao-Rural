const fs = require('fs');
let code = fs.readFileSync('src/components/TransactionsSection.tsx', 'utf8');

const target = `<button
                            onClick={() => handleEditClick(tx)}
                            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>`;

const newBtn = `
                          {tx.status === 'paid' && (
                            <button
                              onClick={() => { setLinkingTx(tx); setLinkCycleId(tx.cycleId ? String(tx.cycleId) : ''); setLinkQuantity(''); setLinkUnit('kg'); }}
                              className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                              title="Gerar Custo/Receita (Vincular a Ciclo)"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}
`;

if (code.includes(target)) {
  code = code.replace(target, target + newBtn);
  fs.writeFileSync('src/components/TransactionsSection.tsx', code);
  console.log("Button patched.");
} else {
  console.log("Target not found!");
}
