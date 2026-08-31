import type { ColabConnection } from './colab-connection'

export class ColabConnectionManager {
  readonly #connections = new Map<string, ColabConnection>()

  add(connection: ColabConnection): void {
    if (this.#connections.has(connection.id)) {
      throw new Error(`A Colab connection with ID "${connection.id}" already exists.`)
    }

    this.#connections.set(connection.id, connection)
  }

  get(connectionId: string): ColabConnection | null {
    return this.#connections.get(connectionId) ?? null
  }

  list(): ColabConnection[] {
    return Array.from(this.#connections.values())
  }

  remove(connectionId: string): boolean {
    return this.#connections.delete(connectionId)
  }

  clear(): void {
    this.#connections.clear()
  }
}
