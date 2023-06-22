import { Modal, App, TAbstractFile } from 'obsidian'
import { Notes } from 'src/Models/Notes'
//import '../../styles.css'

export class PromptModal extends Modal {
  private notes: Array<Notes>
  private docs: Array<any>
  private file: TAbstractFile | null
  private stuff: any
  private resolveFn: ((result: string | null) => void) | null = null;

  constructor(app: App, notes: Notes[]) {
      super(app);
      this.notes = notes

      this.docs = this.notes.flatMap((obj) => {
          const { id, title, tags, path } = obj;
          return tags?.map((tag) => ({
            id: `${id}-${tag}`,
            value: tag,
            titlePaths: { titles: this.notes.filter((o) => o.tags?.includes(tag)).map((o) => o.title), paths: this.notes.filter((o) => o.tags?.includes(tag)).map((o) => o.path)},
            titles: this.notes.filter((o) => o.tags?.includes(tag)).map((o) => o.title),
            paths: this.notes.filter((o) => o.tags?.includes(tag)).map((o) => o.path)
          }));
      });

      this.modalEl.addClass("memorizationModal")
  }

  calculateSuggestions(input: string): any[] {
      const suggestions: any[] = []

      this.docs.forEach((doc) => {
          const value = (doc as { value: String }).value
          const lowerCase = value.toLowerCase().substring(1)
          const upperCase = value.toUpperCase().substring(1)

          if ((lowerCase.contains(input) || upperCase.contains(input) || value.contains(input)) && !value.contains("MemorizationPlugin") && input !== '') {
              if(!suggestions.contains(value.toString())) {
                  suggestions.push({tag: value.toString(), titles: doc.titles, paths: doc.paths })
              }
          }
      })

      return suggestions
  }

  async open(): Promise<string | null> {
      return new Promise((resolve) => {
          this.resolveFn = resolve;
          super.open()
      });
  }

  async onOpen() {
      this.docs = this.docs.filter((value, index, self) =>
          index === self.findIndex((t) => (
              t.value === value.value
          ))
      )

      this.titleEl.createEl('h1', { text: 'Search by tag'} )
      const searchInput = this.contentEl.createEl('input', { type: 'text', cls: "memorizationSearchInput" })
      const suggestionsContainer = this.contentEl.createEl('div', { cls: "memorizationSuggestionsContainer" })

      searchInput.addEventListener('input', async (e) => {
          suggestionsContainer.textContent = ''

          const query = (e.target as HTMLInputElement)?.value ?? ''

          const suggestions = this.calculateSuggestions(query)
          if (suggestions.length > 0) {
              suggestionsContainer.style.visibility = 'visible'
          } else {
              suggestionsContainer.style.visibility = 'hidden'
          }

          suggestions.forEach((suggestion) => {
              const item = suggestionsContainer.createEl('div', { cls: 'memorizationItemLeave' })
              item.textContent = suggestion.tag

              item.addEventListener('mouseenter', () => {
                item.className = "memorizationItemEnter"
              })

              item.addEventListener('mouseleave', () => {
                  item.className = "memorizationItemLeave"
              })

              item.addEventListener('click', async () => {
                  const filteredTitles =	suggestion.titles.filter((str: string) => !str.includes("[Memorization-Plugin]"));

                  suggestion.titles = await filteredTitles
                  const mergedArray = filteredTitles.map((value: string, index: number) => {
                      return { title: value, path: suggestion.paths[index] };
                  });
                  suggestion.titlePaths = mergedArray
                  if (this.resolveFn) {
                      this.resolveFn(suggestion);
                      this.resolveFn = null;
                      this.close();
                    }
                  this.app.workspace.onLayoutReady( () => {
                      this.close();
                  });
              })
          })
      })
  }
}
