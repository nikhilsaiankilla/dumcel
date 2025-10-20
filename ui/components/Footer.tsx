import Image from 'next/image'
import React from 'react'

const Footer = () => {
    return (
        <footer className='w-full max-w-7xl mx-auto pt-20 px-5 md:px-0'>
            <div className='w-full flex items-start flex-wrap justify-between gap-10'>
                <div className='flex flex-col gap-3'>
                    <h3 className='text-lg text-white font-bold'>Products</h3>
                    <ul className='flex flex-col gap-2 text-gray-400 text-sm'>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                    </ul>
                </div>
                <div className='flex flex-col gap-3'>
                    <h3 className='text-lg text-white font-bold'>Products</h3>
                    <ul className='flex flex-col gap-2 text-gray-400 text-sm'>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                    </ul>
                </div>
                <div className='flex flex-col gap-3'>
                    <h3 className='text-lg text-white font-bold'>Products</h3>
                    <ul className='flex flex-col gap-2 text-gray-400 text-sm'>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                        <li>Deploy</li>
                    </ul>
                </div>
                <Image src='/logo.png' alt='logo' width={30} height={30} />
            </div>

            <p className='text-center my-10'>Developed by nikhil sai ankilla</p>
        </footer>
    )
}

export default Footer