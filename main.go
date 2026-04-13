package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"flag"
)

func main() {
	// --- 1. CONFIGURACIÓN DE ENTRADAS ---
	// Definimos las "flags" o banderas que el usuario puede pasar por consola
	// flag.Bool(nombre, valor_por_defecto, descripción)
	cleanCodes := flag.Bool("limpiar", false, "Eliminar instrucciones M0 y M6")
	outputFileName := flag.String("o", "resultado_unido.gcode", "Nombre del archivo de salida")
	
	flag.Parse() // ¡Importante! Sin esto, Go no lee las banderas

	// Los archivos a procesar son los argumentos que sobran después de las flags
	inputFiles := flag.Args()

	if len(inputFiles) < 1 {
		fmt.Println("❌ Error: Debes arrastrar al menos un archivo G-code.")
		fmt.Println("Uso: go run main.go -limpiar=true archivo1.gcode archivo2.gcode")
		return
	}

	// --- 2. PREPARAR EL ARCHIVO DE SALIDA ---
	outFile, err := os.Create(*outputFileName)
	if err != nil {
		fmt.Printf("❌ Error creando el archivo final: %v\n", err)
		return
	}
	defer outFile.Close() // Se cierra solo al finalizar la función main

	writer := bufio.NewWriter(outFile)
	fmt.Printf("🚀 Iniciando concatenación de %d archivos...\n", len(inputFiles))

	// --- 3. PROCESAR CADA ARCHIVO ---
	for _, fileName := range inputFiles {
		fmt.Printf("📂 Procesando: %s\n", fileName)
		
		err := processGcode(fileName, writer, *cleanCodes)
		if err != nil {
			fmt.Printf("⚠️  Error en %s: %v\n", fileName, err)
		}
		
		// Agregamos un salto de línea entre archivos por seguridad
		writer.WriteString("\n; --- Fin de segmento ---\n\n")
	}

	// Guardar los cambios finales en el disco
	writer.Flush()
	fmt.Printf("\n✅ ¡Listo! Archivo generado como: %s\n", *outputFileName)
}

// Función encargada de leer y filtrar cada línea
func processGcode(path string, writer *bufio.Writer, filter bool) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		trimmedLine := strings.TrimSpace(strings.ToUpper(line))

		// Lógica de filtrado: Si filter es true, saltamos M0 y M6
		if filter {
			// Verificamos si la línea EMPIEZA con el comando (evita falsos positivos en comentarios)
			if strings.HasPrefix(trimmedLine, "M0") || strings.HasPrefix(trimmedLine, "M6") {
				continue // Salta a la siguiente línea
			}
		}

		// Escribir la línea original (manteniendo espacios/formato)
		_, err := writer.WriteString(line + "\n")
		if err != nil {
			return err
		}
	}
	return scanner.Err()
}