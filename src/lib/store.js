import { create } from "zustand"
import { persist } from "zustand/middleware"

function makeConvo(id) {
  return {
    id,
    title: "New Chat",
    messages: [],
    chatHistory: [],
    elements: [],
    transform: { x: 0, y: 0, scale: 1 },
    createdAt: Date.now(),
  }
}

const firstId = crypto.randomUUID()

function isConvoEmpty(c) {
  return c.messages.length === 0 && c.elements.length === 0
}

export const useConvoStore = create(
  persist(
    (set, get) => ({
      convos: { [firstId]: makeConvo(firstId) },
      activeId: firstId,
      order: [firstId],

      getActive: () => {
        const { convos, activeId } = get()
        return convos[activeId]
      },

      newConvo: () => {
        const { convos, activeId } = get()
        const current = convos[activeId]
        if (current && isConvoEmpty(current)) return activeId

        const id = crypto.randomUUID()
        const convo = makeConvo(id)
        set((s) => ({
          convos: { ...s.convos, [id]: convo },
          order: [id, ...s.order],
          activeId: id,
        }))
        return id
      },

      switchConvo: (id) => {
        set({ activeId: id })
      },

      deleteConvo: (id) => {
        const { order, convos, activeId } = get()
        const newOrder = order.filter((i) => i !== id)
        const newConvos = { ...convos }
        delete newConvos[id]

        if (newOrder.length === 0) {
          const freshId = crypto.randomUUID()
          const fresh = makeConvo(freshId)
          set({
            convos: { [freshId]: fresh },
            order: [freshId],
            activeId: freshId,
          })
        } else {
          set({
            convos: newConvos,
            order: newOrder,
            activeId: activeId === id ? newOrder[0] : activeId,
          })
        }
      },

      updateConvo: (id, updates) => {
        set((s) => {
          if (!s.convos[id]) return s
          return {
            convos: {
              ...s.convos,
              [id]: { ...s.convos[id], ...updates },
            },
          }
        })
      },

      setTitle: (id, title) => {
        set((s) => {
          if (!s.convos[id]) return s
          return {
            convos: {
              ...s.convos,
              [id]: { ...s.convos[id], title },
            },
          }
        })
      },
    }),
    {
      name: "tp_convos",
      partialize: (state) => ({
        convos: Object.fromEntries(
          Object.entries(state.convos).map(([id, c]) => [
            id,
            {
              id: c.id,
              title: c.title,
              messages: c.messages,
              chatHistory: c.chatHistory,
              elements: c.elements,
              transform: c.transform,
              createdAt: c.createdAt,
            },
          ])
        ),
        activeId: state.activeId,
        order: state.order,
      }),
    }
  )
)
