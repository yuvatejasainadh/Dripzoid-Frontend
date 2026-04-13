// src/components/NewArrivals.jsx
import React from "react";

const NewArrivals = () => {
  return (
    <section className="py-16 px-4 bg-white dark:bg-gray-900">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">New Arrivals</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg text-center">
          <h3 className="text-lg font-semibold">Baggy Jeans</h3>
          <p className="text-gray-500 dark:text-gray-400">₹1,499</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg text-center">
          <h3 className="text-lg font-semibold">Varsity Jacket</h3>
          <p className="text-gray-500 dark:text-gray-400">₹2,999</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg text-center">
          <h3 className="text-lg font-semibold">Y2K Tee</h3>
          <p className="text-gray-500 dark:text-gray-400">₹799</p>
        </div>
      </div>
    </section>
  );
};

export default NewArrivals;
