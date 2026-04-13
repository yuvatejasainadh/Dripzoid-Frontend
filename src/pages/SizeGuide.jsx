import React from "react";

export default function SizeGuide() {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-black text-black dark:text-white">
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-extrabold mb-6">Size Guide</h1>

        <p className="text-neutral-600 dark:text-neutral-400 mb-10">
          Find your perfect fit. All measurements are in centimeters (cm).
        </p>

        <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-neutral-900">
          <table className="w-full text-left">
            <thead className="bg-neutral-100 dark:bg-neutral-800">
              <tr>
                <th className="p-4">Size</th>
                <th className="p-4">Chest</th>
                <th className="p-4">Length</th>
                <th className="p-4">Shoulder</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["S", "38", "26", "17"],
                ["M", "40", "27", "18"],
                ["L", "42", "28", "19"],
                ["XL", "44", "29", "20"],
              ].map((row) => (
                <tr key={row[0]} className="border-t">
                  {row.map((cell) => (
                    <td key={cell} className="p-4">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-neutral-500 mt-6">
          Still unsure? Contact us for personalized size recommendations.
        </p>
      </section>
    </main>
  );
}
