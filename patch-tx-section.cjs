const fs = require('fs');
let code = fs.readFileSync('src/components/TransactionsSection.tsx', 'utf8');

// Add new state variables
const newStates = `
  const [linkingTx, setLinkingTx] = useState<Transaction | null>(null);
  const [linkCycleId, setLinkCycleId] = useState('');
  const [linkQuantity, setLinkQuantity] = useState('');
  const [linkUnit, setLinkUnit] = useState('kg');
  const [linkSuccessMsg, setLinkSuccessMsg] = useState<string | null>(null);

  const handleLink = async () => {
    if (!linkingTx) return;
    try {
      const payload: any = { cycleId: linkCycleId };
      if (linkingTx.type === 'receivable') {
        payload.quantity = linkQuantity;
        payload.unit = linkUnit;
      }
      const res = await fetchWithAuth(\`/api/transactions/\${linkingTx.id}/link\`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setLinkSuccessMsg(data.message);
        setTimeout(() => setLinkSuccessMsg(null), 3000);
        setLinkingTx(null);
      } else {
        setError(data.error || 'Erro ao vincular transação.');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor.');
    }
  };
`;

code = code.replace('  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);', '  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);' + newStates);


// Add the link button next to "Edit" button
const editBtnTarget = `onClick={() => handleEdit(tx)}
                        className="text-stone-400 hover:text-blue-600 transition-colors p-1"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>`;
const linkBtn = `
                      {tx.status === 'paid' && (
                        <button
                          onClick={() => { setLinkingTx(tx); setLinkCycleId(tx.cycleId ? String(tx.cycleId) : ''); setLinkQuantity(''); setLinkUnit('kg'); }}
                          className="text-stone-400 hover:text-emerald-600 transition-colors p-1"
                          title="Gerar Custo/Receita (Vincular a Ciclo)"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      )}
`;

code = code.replace(editBtnTarget, editBtnTarget + linkBtn);

// Add Linking modal next to Delete Modal
const deleteModalTarget = `{deletingTx && (`;
const linkModal = `
      {linkSuccessMsg && (
        <div className="fixed top-4 right-4 bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          <p className="text-sm font-medium">{linkSuccessMsg}</p>
        </div>
      )}

      {linkingTx && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 bg-stone-50/50">
              <h3 className="text-lg font-serif italic font-bold text-stone-800 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                Vincular a Ciclo Produtivo
              </h3>
              <p className="text-sm text-stone-500 mt-1">
                Deseja gerar um lançamento de {linkingTx.type === 'payable' ? 'Custo' : 'Receita (Colheita)'} para esta transação?
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Ciclo Produtivo
                </label>
                <select
                  value={linkCycleId}
                  onChange={(e) => setLinkCycleId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#ece3ce] focus:border-[#ece3ce] transition-all outline-none"
                >
                  <option value="">Selecione um ciclo...</option>
                  {cycles.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.name} ({cycle.plotName})
                    </option>
                  ))}
                </select>
              </div>

              {linkingTx.type === 'receivable' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={linkQuantity}
                      onChange={(e) => setLinkQuantity(e.target.value)}
                      placeholder="Ex: 100"
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#ece3ce] focus:border-[#ece3ce] transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                      Unidade
                    </label>
                    <input
                      type="text"
                      value={linkUnit}
                      onChange={(e) => setLinkUnit(e.target.value)}
                      placeholder="Ex: sacas"
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#ece3ce] focus:border-[#ece3ce] transition-all outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-stone-50/50 border-t border-stone-100 flex justify-end gap-3">
              <button
                onClick={() => setLinkingTx(null)}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLink}
                disabled={!linkCycleId || (linkingTx.type === 'receivable' && (!linkQuantity || !linkUnit))}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Gerar {linkingTx.type === 'payable' ? 'Custo' : 'Receita'}
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(deleteModalTarget, linkModal + '\n' + deleteModalTarget);

fs.writeFileSync('src/components/TransactionsSection.tsx', code);
