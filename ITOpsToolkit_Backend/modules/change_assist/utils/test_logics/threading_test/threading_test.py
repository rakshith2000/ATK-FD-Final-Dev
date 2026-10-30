import asyncio

async def async_numbers():
    for number in range(3):
        yield number
        await asyncio.sleep(0.1)

# Usage
async def main():
    async_iter = async_numbers()
    print(await anext(async_iter, None))  # Output: 0
    print(await anext(async_iter, None))  # Output: 1
    print(await anext(async_iter, None))  # Output: 2

    # Below line throws exception since post 3 iterations, for loop gets exhausted.
    try:
        print(await anext(async_iter))
    except Exception as e:
        print("StopAsync")

    # Set default value to None and exception won't be thrown.
    # In a loop where number of iterations are uncertain, simply use equality condition for None and break the loop
    print(await anext(async_iter, None))  # Output:

asyncio.run(main())
